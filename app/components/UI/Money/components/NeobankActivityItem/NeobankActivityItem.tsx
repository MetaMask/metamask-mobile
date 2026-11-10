import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import type { NeobankBankTransferActivity } from '../../types/moneyActivity';
import { neobankActivityDisplayInfo } from '../../utils/neobankActivity';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface NeobankActivityItemProps {
  activity: NeobankBankTransferActivity;
  privacyMode?: boolean;
}

const NeobankActivityItem = ({
  activity,
  privacyMode = false,
}: NeobankActivityItemProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );

  const display = useMemo(
    () => neobankActivityDisplayInfo(activity),
    [activity],
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.MONEY.CARD_TRANSACTION_DETAILS, {
      neobankActivity: activity,
    });
  }, [navigation, activity]);

  return (
    <ActivityRowView
      id={activity.id}
      display={display}
      onPress={activityDetailsEnabled ? handlePress : undefined}
      privacyMode={privacyMode}
    />
  );
};

export default React.memo(NeobankActivityItem);
