import { useSelector } from 'react-redux';
import { selectMoneyEnableMoneyAccountFlag } from '../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';

interface useMoneyAccountVisibilityResult {
  isMoneyAccountVisible: boolean;
}

/**
 * Follow up in [MUSD-1298](https://consensyssoftware.atlassian.net/browse/MUSD-1298)
 * by replacing duplicated Money account visibility checks with this hook to
 * keep feature-flag and geo-eligibility logic centralized.
 *
 * Candidates:
 * - `app/components/Views/Wallet/index.tsx:402`
 * - `app/components/Nav/Main/MainNavigator.js:588`
 * - `app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView.tsx:207`
 * - `app/components/UI/Card/hooks/useMoneyAccountCardLinkage.tsx:155`
 */

const useMoneyAccountVisibility = (): useMoneyAccountVisibilityResult => {
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );

  const isMoneyAccountVisible =
    isMoneyAccountEnabled && isMoneyAccountGeoEligible;

  return { isMoneyAccountVisible };
};

export default useMoneyAccountVisibility;
