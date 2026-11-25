import { useSelector } from 'react-redux';

import {
    selectReferralLink,
    selectReferralProgramData,
    selectReferralRewards,
} from '@suite-common/refer-a-friend';
import { Translation } from '@suite-native/intl';
import { Screen, ScreenHeader } from '@suite-native/navigation';
import {
    ReferAFriendContentActive,
    ReferAFriendContentInactive,
    useReferAFriend,
} from '@suite-native/refer-a-friend';

export const ReferAFriendScreen = () => {
    const { isReferAFriendFeatureEnabled } = useReferAFriend();

    const programData = useSelector(selectReferralProgramData);
    const referralLink = useSelector(selectReferralLink);
    const referralRewards = useSelector(selectReferralRewards);

    if (!isReferAFriendFeatureEnabled || !programData) {
        return null;
    }

    return (
        <Screen header={<ScreenHeader title={<Translation id="referAFriend.title" />} />}>
            {referralLink ? (
                <ReferAFriendContentActive
                    programData={programData}
                    referralLink={referralLink}
                    referralRewards={referralRewards}
                />
            ) : (
                <ReferAFriendContentInactive programData={programData} />
            )}
        </Screen>
    );
};
