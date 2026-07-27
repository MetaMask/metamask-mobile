import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { accountsApiActivityDisplayInfo } from '../../utils/accountsApiActivityDisplayInfo';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import type { AccountsApiActivity } from '../../types/moneyActivity';
import type { CardTransaction } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface AccountsApiActivityItemProps {
  activity: AccountsApiActivity;
  showNetworkBadge?: boolean;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
  enrichment?: CardTransaction;
}

const AccountsApiActivityItem = ({
  activity,
  showNetworkBadge = false,
  privacyMode = false,
  enrichment,
}: AccountsApiActivityItemProps) => {
  const navigation = useNavigation();
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );

  const display = useMemo(
    () => accountsApiActivityDisplayInfo(activity, enrichment),
    [activity, enrichment],
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.MONEY.CARD_TRANSACTION_DETAILS, {
      activity,
      enrichment,
    });
  }, [navigation, activity, enrichment]);

  return (
    <ActivityRowView
      id={activity.hash}
      display={display}
      chainId={activity.chainId}
      onPress={activityDetailsEnabled ? handlePress : undefined}
      showNetworkBadge={showNetworkBadge}
      privacyMode={privacyMode}
    />
  );
};

export default AccountsApiActivityItem;
