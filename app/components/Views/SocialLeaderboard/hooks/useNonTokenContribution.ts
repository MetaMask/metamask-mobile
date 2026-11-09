import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { usePerpsLiveAccount } from '../../../UI/Perps/hooks/stream/usePerpsLiveAccount';
import { usePerpsConnection } from '../../../UI/Perps/hooks/usePerpsConnection';
import { selectPerpsEnabledFlag } from '../../../UI/Perps/selectors/featureFlags';
import {
  usePredictAvailability,
  usePredictPortfolioValue,
} from '../../../UI/PredictNext';
import { getUsdToFiatConversionRate } from '../../../UI/Money/utils/moneyActivityFiat';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { selectDefiPositionsByChainIds } from '../../../../selectors/defiPositionsController';
import { selectDeFiPositionsSectionEnabled } from '../../../../selectors/deFiPositionsSectionEnabled';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import type { RootState } from '../../../../reducers';
import { useMoneyContribution } from './moneyContribution';
import {
  nonTokenContribution,
  sumDefiPositionsUsd,
  type NonTokenContribution,
  type PortfolioSlice,
} from './portfolioBalance';

// Same throttle the homepage uses for perps. Kept local so SocialLeaderboard
// does not import from the sibling Homepage route directory (ADR 0020).
const PERPS_SOCIAL_THROTTLE_MS = 1000;

const SKIP: PortfolioSlice = { status: 'ineligible', valueFiat: 0 };
const LOADING: PortfolioSlice = { status: 'loading', valueFiat: 0 };

/**
 * Perps, predictions, DeFi, and money for the selected account, in the user's
 * currency. A missing controller is skipped so the profile list still renders.
 */
export const useNonTokenContribution = (): NonTokenContribution => {
  const userCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const toUserCurrency = useCallback(
    (usdAmount: number): number | undefined => {
      if (typeof userCurrency !== 'string' || userCurrency.length === 0) {
        return undefined;
      }
      if (!Number.isFinite(usdAmount)) {
        return 0;
      }
      if (userCurrency.toLowerCase() === 'usd') {
        return usdAmount;
      }
      const rate = getUsdToFiatConversionRate(currencyRates);
      return rate === undefined ? undefined : usdAmount * rate;
    },
    [currencyRates, userCurrency],
  );

  const perpsEnabled = useSelector(selectPerpsEnabledFlag);
  const { account, isInitialLoading } = usePerpsLiveAccount({
    enabled: perpsEnabled,
    throttleMs: PERPS_SOCIAL_THROTTLE_MS,
  });
  const { error: connectionError } = usePerpsConnection();
  const perpsUsd = parseFloat(account?.totalBalance ?? '0') || 0;
  const perpsFiat = toUserCurrency(perpsUsd);
  let perps: PortfolioSlice = SKIP;
  if (perpsEnabled) {
    if (!account && connectionError) {
      perps = { status: 'error', valueFiat: 0 };
    } else if (isInitialLoading || !account) {
      perps = LOADING;
    } else if (perpsFiat === undefined) {
      perps = { status: 'error', valueFiat: 0 };
    } else {
      perps = { status: 'ready', valueFiat: perpsFiat };
    }
  }

  const predictAvailable = usePredictAvailability();
  const predictValue = usePredictPortfolioValue();
  let predict: PortfolioSlice = SKIP;
  if (predictAvailable && predictValue.status !== 'unavailable') {
    if (predictValue.status !== 'ready') {
      predict = { status: predictValue.status, valueFiat: 0 };
    } else {
      const predictFiat =
        typeof predictValue.valueUsd === 'number'
          ? toUserCurrency(predictValue.valueUsd)
          : undefined;
      predict =
        predictFiat === undefined
          ? { status: 'error', valueFiat: 0 }
          : { status: 'ready', valueFiat: predictFiat };
    }
  }

  const { popularEvmNetworks } = useNetworkEnablement();
  const defiEnabled = useSelector(selectDeFiPositionsSectionEnabled);
  const defiPositions = useSelector((state: RootState) => {
    if (!state.engine.backgroundState.DeFiPositionsController) {
      return null;
    }
    return selectDefiPositionsByChainIds(state, popularEvmNetworks as Hex[]);
  });
  let defi: PortfolioSlice = SKIP;
  if (defiEnabled) {
    if (defiPositions === undefined) {
      defi = LOADING;
    } else if (defiPositions === null) {
      defi = SKIP;
    } else {
      const defiFiat = toUserCurrency(sumDefiPositionsUsd(defiPositions));
      defi =
        defiFiat === undefined
          ? { status: 'error', valueFiat: 0 }
          : { status: 'ready', valueFiat: defiFiat };
    }
  }

  const money = useMoneyContribution();

  return nonTokenContribution({ perps, predict, defi, money });
};
