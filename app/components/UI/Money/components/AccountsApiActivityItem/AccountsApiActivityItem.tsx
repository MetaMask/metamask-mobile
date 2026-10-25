import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { selectTransactionMetadataByHash } from '../../../../../selectors/transactionController';
import type { RootState } from '../../../../../reducers';
import { accountsApiActivityDisplayInfo } from '../../utils/accountsApiActivityDisplayInfo';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import { isMoneyActivityDeposit } from '../../constants/moneyActivityFilters';
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
  const navigation = useNavigation<AppNavigationProp>();
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );
  const localDepositTx = useSelector((state: RootState) =>
    selectTransactionMetadataByHash(state, activity.hash),
  );

  const display = useMemo(
    () => accountsApiActivityDisplayInfo(activity, enrichment),
    [activity, enrichment],
  );

  const handlePress = useCallback(() => {
    // VBA bank transfers always use the custom API details view so the
    // off-chain transfer and mUSD deposit render as two distinct legs, even
    // when the settlement hash matches a local Money deposit.
    if (
      activity.kind !== 'bank_transfer' &&
      localDepositTx &&
      isMoneyActivityDeposit(localDepositTx)
    ) {
      // Non-VBA Accounts API activity keeps its previous preference for local
      // Money deposit details (full Steps / fiat timeline).
      navigation.navigate(Routes.MONEY.TRANSACTION_DETAILS, {
        transactionId: localDepositTx.id,
      });
      return;
    }

    navigation.navigate(Routes.MONEY.CARD_TRANSACTION_DETAILS, {
      activity,
      enrichment,
    });
  }, [navigation, activity, enrichment, localDepositTx]);

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
