import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import useMoneyAccountBalance from '../../../UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../UI/Money/hooks/useMoneyAccountInfo';
import { selectIsMoneyAccountVisible } from '../../../UI/Money/selectors/visibility';
import { getUsdToFiatConversionRate } from '../../../UI/Money/utils/moneyActivityFiat';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import type { RootState } from '../../../../reducers';
import type { PortfolioSlice } from './portfolioBalance';

const SKIP: PortfolioSlice = { status: 'ineligible', valueFiat: 0 };
const LOADING: PortfolioSlice = { status: 'loading', valueFiat: 0 };

const MoneyContributionContext = createContext<PortfolioSlice>(SKIP);

/**
 * Money slice for the selected account. Ineligible when the money controller
 * is absent, so callers never touch `selectMoneyAccounts` on a store that
 * does not have it.
 */
export const useMoneyContribution = (): PortfolioSlice =>
  useContext(MoneyContributionContext);

const selectHasMoneyAccounts = (state: RootState): boolean =>
  state.engine?.backgroundState?.MoneyAccountController?.moneyAccounts != null;

const MoneyContributionReader = ({ children }: { children: ReactNode }) => {
  const userCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const { isMoneyAccountFeatureEnabled, hasMoneyAccount } =
    useMoneyAccountInfo();
  const isMoneyAccountAvailable = useSelector(selectIsMoneyAccountVisible);
  const { tokenTotal, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance({ enabled: isMoneyAccountFeatureEnabled });

  const slice = useMemo<PortfolioSlice>(() => {
    const isMoneyVisible =
      isMoneyAccountAvailable ||
      (isMoneyAccountFeatureEnabled && hasMoneyAccount);
    if (!isMoneyVisible || !hasMoneyAccount) {
      return SKIP;
    }
    if (isBalanceFetchError) {
      return { status: 'error', valueFiat: 0 };
    }
    if (isBalanceLoading || tokenTotal === undefined) {
      return LOADING;
    }
    if (typeof userCurrency !== 'string' || userCurrency.length === 0) {
      return { status: 'error', valueFiat: 0 };
    }
    const usdAmount = tokenTotal.toNumber();
    if (!Number.isFinite(usdAmount)) {
      return { status: 'ready', valueFiat: 0 };
    }
    if (userCurrency.toLowerCase() === 'usd') {
      return { status: 'ready', valueFiat: usdAmount };
    }
    const rate = getUsdToFiatConversionRate(currencyRates);
    return rate === undefined
      ? { status: 'error', valueFiat: 0 }
      : { status: 'ready', valueFiat: usdAmount * rate };
  }, [
    currencyRates,
    hasMoneyAccount,
    isBalanceFetchError,
    isBalanceLoading,
    isMoneyAccountAvailable,
    isMoneyAccountFeatureEnabled,
    tokenTotal,
    userCurrency,
  ]);

  return (
    <MoneyContributionContext.Provider value={slice}>
      {children}
    </MoneyContributionContext.Provider>
  );
};

export const MoneyContributionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const hasMoneyAccounts = useSelector(selectHasMoneyAccounts);
  if (!hasMoneyAccounts) {
    return (
      <MoneyContributionContext.Provider value={SKIP}>
        {children}
      </MoneyContributionContext.Provider>
    );
  }
  return <MoneyContributionReader>{children}</MoneyContributionReader>;
};
