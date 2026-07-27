import { useSelector } from 'react-redux';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../Money/selectors/eligibility';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { useCardCapabilities } from './useCardCapabilities';

export function useShowCardTransactionHistoryEntry(): boolean {
  const enabled = useSelector(selectCardTransactionHistoryEnabled);
  const capabilities = useCardCapabilities();
  const moneyAccountFlag = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);

  const isMoneyAccountEnabledForUser =
    moneyAccountFlag && isGeoEligible && Boolean(primaryMoneyAccount);

  const historyLivesInMoneyFeed =
    isMoneyAccountEnabledForUser &&
    (capabilities?.supportsMoneyAccountLinking ?? false);

  return (
    enabled &&
    (capabilities?.supportsTransactionHistory ?? false) &&
    !historyLivesInMoneyFeed
  );
}
