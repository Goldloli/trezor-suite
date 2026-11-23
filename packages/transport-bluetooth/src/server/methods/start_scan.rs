use btleplug::{
    api::{Central, ScanFilter},
    platform::Adapter,
};
use log::info;
use tokio::{
    sync::broadcast::error::RecvError,
    time::{sleep, Duration},
};

use crate::server::{
    adapter_manager::{AdapterError, AdapterManager},
    types::{
        AbortProcess, AdapterState, ChannelMessage, MethodResult, NotificationEvent,
        WsResponsePayload,
    },
    ConnectionBroadcast,
};

async fn start_scanning(adapter: &Adapter, manager: &AdapterManager) -> Result<(), AdapterError> {
    // stop previous process just to be sure
    stop_scanning(adapter, manager).await;

    if let Err(err) = adapter.start_scan(ScanFilter::default()).await {
        info!("Start scan error {err}");
        return Err(err.into());
    }

    Ok(())
}

async fn stop_scanning(adapter: &Adapter, manager: &AdapterManager) {
    if let Err(err) = adapter.stop_scan().await {
        info!("start_scan/adapter.stop_scan: {err}");
    }

    manager.clear_serviceless_devices().await;
}

pub async fn start_scan(manager: AdapterManager, broadcast: ConnectionBroadcast) -> MethodResult {
    let mut radio = manager
        .lock_discovery_queue_for_request("start_scan")
        .await?;
    if !manager.has_listener(&broadcast).await {
        return Err(AdapterError::ClientDisconnected.into());
    }

    // AdapterManager resets the flag when the adapter turns off, nothing else
    // sets it while the queue is held, so this single read is authoritative.
    if manager.is_scanning().await {
        info!("AdapterManager is already scanning");
        drop(radio);
        let devices = manager.get_devices().await;
        return Ok(WsResponsePayload::Peripherals { devices });
    }

    // a running scan only returns the list, so only a real start needs the radio
    manager
        .wait_for_discovery_radio(&mut radio, "start_scan")
        .await?;

    // The radio wait can take DISCOVERY_REQUEST_WAIT. Requests are not cancelled on
    // disconnect, so without this check a scan would be started for a client
    // that left, and the last-listener cleanup would stop it right after.
    if !manager.has_listener(&broadcast).await {
        return Err(AdapterError::ClientDisconnected.into());
    }

    let mut receiver = broadcast.subscribe();
    let adapter = manager.get_powered_adapter_or_die().await?;

    // start or restart scanning process
    // restart (stop/start) ensures that the event stream is really running in
    // workaround for https://github.com/deviceplug/btleplug/issues/255
    // windows: calling adapter.stop_scan breaks current broadcast.subscribe stream
    if let Err(err) = start_scanning(&adapter, &manager).await {
        stop_scanning(&adapter, &manager).await;
        return Err(err.into());
    }
    // The adapter can turn off between the start above and this flag. The
    // event of that turn resets a flag that is not set yet, so the flag is
    // set only next to the state and the started scan is stopped here.
    if !manager.mark_scanning_started().await {
        info!("Adapter turned off during the scan start, stopping it");
        stop_scanning(&adapter, &manager).await;
        return Ok(WsResponsePayload::Peripherals {
            devices: manager.get_devices().await,
        });
    }

    // listen for Abort and AdapterStateChanged messages from the other threads
    tokio::spawn(async move {
        loop {
            let event = match receiver.recv().await {
                Ok(event) => event,
                Err(RecvError::Lagged(skipped)) => {
                    info!("start_scan loop lagged, {skipped} events skipped");
                    continue;
                }
                Err(RecvError::Closed) => break,
            };

            match event {
                ChannelMessage::Abort(AbortProcess::Scan) => {
                    // Scanning itself was already stopped by the stop_scan method.
                    info!("Abort start_scan loop");
                    break;
                }
                ChannelMessage::Abort(AbortProcess::ClientDisconnected(_client)) => {
                    // Last-client cleanup is owned by AdapterManager::remove_listener.
                    break;
                }
                ChannelMessage::Notification(NotificationEvent::AdapterStateChanged { state })
                    if !matches!(state, AdapterState::Enabled) =>
                {
                    // AdapterManager reset the flag before it sent this notification
                    info!("Adapter {state:?}, the scan stopped");
                    break;
                }
                _ => {}
            }
        }
        info!("start_scan loop done");
    });
    drop(radio);

    // wait for first discovery events and enumerate
    sleep(Duration::from_millis(200)).await;

    let devices = manager.get_devices().await;
    Ok(WsResponsePayload::Peripherals { devices })
}
