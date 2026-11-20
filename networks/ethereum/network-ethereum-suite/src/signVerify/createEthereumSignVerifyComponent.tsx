import { type FunctionComponent } from 'react';

import { SignVerify } from '@suite/sign-verify';
import { type SignVerifyReporterDep, getReadyDevice } from '@suite-common/sign-verify';
import {
    type SignEthereumMessageDep,
    type VerifyEthereumMessageDep,
} from '@trezor/network-ethereum-suite-common';
import { type EthereumNetworkSymbol } from '@trezor/network-ethereum-types';
import type { SignVerifyProps } from '@trezor/network-module-suite-types';

export type EthereumSignVerifyComponentDeps = SignEthereumMessageDep &
    VerifyEthereumMessageDep &
    SignVerifyReporterDep;

export type EthereumSignVerifyComponent = FunctionComponent<SignVerifyProps<EthereumNetworkSymbol>>;

export const createEthereumSignVerifyComponent =
    (deps: EthereumSignVerifyComponentDeps): EthereumSignVerifyComponent =>
    ({ networkSymbol, account }) => {
        const accountAddress = { path: account.path, address: account.descriptor };

        return (
            <SignVerify>
                <SignVerify.Tabs>
                    <SignVerify.Tab page="sign" />
                    <SignVerify.Tab page="verify" />
                </SignVerify.Tabs>
                <SignVerify.SignForm
                    defaultAddress={accountAddress}
                    sign={async ({ device, message, hex }) => {
                        const readyDevice = getReadyDevice(device, 'signMessage');
                        const result = readyDevice.success
                            ? await deps.signEthereumMessage({
                                  device: readyDevice.payload,
                                  path: account.path,
                                  message,
                                  hex,
                              })
                            : readyDevice;
                        deps.signVerifyReporter.reportSign({ symbol: networkSymbol, hex }, result);

                        return result;
                    }}
                >
                    <SignVerify.AddressSelect addressGroups={[{ addresses: [accountAddress] }]} />
                    <SignVerify.Message />
                    <SignVerify.Signature />
                </SignVerify.SignForm>
                <SignVerify.VerifyForm
                    symbol={networkSymbol}
                    verify={async ({ device, address, message, signature, hex }) => {
                        const readyDevice = getReadyDevice(device, 'verifyMessage');
                        const result = readyDevice.success
                            ? await deps.verifyEthereumMessage({
                                  device: readyDevice.payload,
                                  address,
                                  message,
                                  signature,
                                  hex,
                              })
                            : readyDevice;
                        deps.signVerifyReporter.reportVerify(
                            { symbol: networkSymbol, hex },
                            result,
                        );

                        return result;
                    }}
                >
                    <SignVerify.AddressInput />
                    <SignVerify.Message />
                    <SignVerify.Signature />
                </SignVerify.VerifyForm>
            </SignVerify>
        );
    };
