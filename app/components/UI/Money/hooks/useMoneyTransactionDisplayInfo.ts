import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  type TransactionMeta,
  type RequiredAsset,
} from '@metamask/transaction-controller';
import { type Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { IconName } from '@metamask/design-system-react-native';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import type { RootState } from '../../../../reducers';
import {
  getMusdDisplayAmountFromTransactionMeta,
  isIncomingMoneyTransactionMeta,
} from '../constants/activityStyles';
import { buildMoneyActivityFiatLine } from '../utils/moneyActivityFiat';
import { moneyFormatFiat } from '../utils/moneyFormatFiat';
import { MUSD_TOKEN } from '../../Earn/constants/musd';
import type { MoneyActivityTransactionMeta } from '../constants/mockActivityData';
import {
  classifyMoneyActivity,
  moneyActivityKindToIcon,
  moneyActivityKindToLabel,
} from '../utils/classifyMoneyActivity';

export interface MoneyTransactionDisplayInfo {
  label: string;
  description: string | undefined;
  primaryAmount: string;
  fiatAmount: string;
  isIncoming: boolean;
  icon: IconName;
}

function getMoneySubtitle(tx: TransactionMeta): string | undefined {
  const extended = tx as MoneyActivityTransactionMeta;
  return extended.moneySubtitle;
}

/**
 * Returns the first required asset from a pay transaction, if present.
 */
function getRequiredAsset(tx: TransactionMeta): RequiredAsset | undefined {
  return tx.requiredAssets?.[0];
}

/**
 * Formats an incoming mUSD amount with 2 fixed decimals and grouping, e.g.
 * "+1,000.00 mUSD". Used for MetaMask Pay conversion deposits, whose amount is
 * the mUSD deposit target (always incoming, so a leading "+").
 */
function formatMusdDepositAmount(amount: BigNumber): string {
  const formatted = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount.toNumber());
  return `+${formatted} ${MUSD_TOKEN.symbol}`;
}

/**
 * Returns true when `tokenAddress` is the native currency on `chainId`
 * (e.g. ETH on mainnet).
 */
function isNativeTokenAddress(tokenAddress: string, chainId: Hex): boolean {
  try {
    const nativeAddress = getNativeTokenAddress(chainId);
    return tokenAddress.toLowerCase() === nativeAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Derives display strings for a Money activity row backed by {@link TransactionMeta}.
 */
export function useMoneyTransactionDisplayInfo(
  tx: TransactionMeta,
  _moneyAddress: string | undefined,
): MoneyTransactionDisplayInfo {
  const subtitle = getMoneySubtitle(tx);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const payTokenAddress = tx.metamaskPay?.tokenAddress as Hex | undefined;
  const payTokenChainId = tx.metamaskPay?.chainId as Hex | undefined;

  // look up erc-20 tokens
  const payToken = useSelector((state: RootState) =>
    payTokenAddress && payTokenChainId
      ? selectSingleTokenByAddressAndChainId(
          state,
          payTokenAddress,
          payTokenChainId,
        )
      : undefined,
  );

  // Native token fallback - these are not in the token registry
  const nativeTicker = useSelector((state: RootState) => {
    if (payToken || !payTokenAddress || !payTokenChainId) {
      return undefined;
    }
    if (isNativeTokenAddress(payTokenAddress, payTokenChainId)) {
      return selectTickerByChainId(state, payTokenChainId);
    }
    return undefined;
  });

  return useMemo(() => {
    const sourceTokenSymbol = payToken?.symbol ?? nativeTicker;

    // --- Primary amount ---
    // Money-account rows are denominated in mUSD (the account's currency).
    // `getMusdDisplayAmountFromTransactionMeta` covers rows carrying an explicit
    // mUSD transfer (received / sent / local transfers, with the correct +/-
    // prefix). MetaMask Pay conversion deposits don't persist an mUSD transfer,
    // so derive the amount from the deposit target in `requiredAssets[0].amount`
    // — already denominated in mUSD (6 decimals), i.e. the USD value of the
    // deposit, pegged 1:1. (Showing the mUSD value rather than the pay-token
    // amount is the design decision in MUSD-956.)
    let primaryAmount = getMusdDisplayAmountFromTransactionMeta(tx);
    if (!primaryAmount) {
      const requiredAsset = getRequiredAsset(tx);
      if (requiredAsset) {
        const musdAmount = new BigNumber(requiredAsset.amount).dividedBy(1e6);
        if (musdAmount.isGreaterThan(0)) {
          primaryAmount = formatMusdDepositAmount(musdAmount);
        }
        // If there's no required asset / amount, primaryAmount stays empty —
        // the fiatAmount line below still shows the correct value.
      }
    }

    // --- Fiat amount ---
    // Prefer calculated market-rate value.
    let fiatAmount = buildMoneyActivityFiatLine(
      tx,
      currencyRates,
      currentCurrency,
      tokenMarketData,
    );
    if (!fiatAmount && currentCurrency) {
      const rawFiat = Number(tx.metamaskPay?.targetFiat);
      if (!isNaN(rawFiat) && rawFiat > 0) {
        fiatAmount = `+${moneyFormatFiat(new BigNumber(rawFiat), currentCurrency)}`;
      }
    }

    const kind = classifyMoneyActivity(tx);

    // Explicit moneySubtitle wins. Otherwise a conversion shows the token pair
    // it routed through (e.g. "ETH → mUSD"); everything else shows just the
    // source token symbol.
    let description = subtitle;
    if (!description) {
      description =
        kind === 'converted' && sourceTokenSymbol
          ? `${sourceTokenSymbol} → ${MUSD_TOKEN.symbol}`
          : sourceTokenSymbol;
    }

    return {
      label: moneyActivityKindToLabel(kind),
      description,
      primaryAmount,
      fiatAmount,
      isIncoming: isIncomingMoneyTransactionMeta(tx),
      icon: moneyActivityKindToIcon(kind),
    };
  }, [
    tx,
    subtitle,
    currentCurrency,
    currencyRates,
    tokenMarketData,
    payToken,
    nativeTicker,
  ]);
}
