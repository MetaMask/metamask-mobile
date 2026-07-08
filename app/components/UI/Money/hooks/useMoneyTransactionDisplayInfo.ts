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
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { renderShortAddress } from '../../../../util/address';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';
import type { RootState } from '../../../../reducers';
import {
  getMusdDisplayAmountFromTransactionMeta,
  isIncomingMoneyTransactionMeta,
} from '../constants/activityStyles';
import { useFiatPaymentMethodName } from './useFiatPaymentMethodName';
import { buildMoneyActivityFiatLine } from '../utils/moneyActivityFiat';
import { moneyFormatUsd } from '../utils/moneyFormatFiat';
import {
  isMusdToken,
  isMusdTokenOnChain,
  MUSD_DECIMALS,
  MUSD_TOKEN,
} from '../../Earn/constants/musd';
import { MONEY_WITHDRAW_TOKEN_SYMBOL } from '../constants/moneyTokens';
import {
  isMoneyWithdrawTx,
  isPerpsPredictMoneyActivity,
  isPerpsPredictMoneyWithdraw,
  perpsPredictServiceFamily,
} from '../utils/moneyTransactionGuards';
import type { MoneyActivityTransactionMeta } from '../constants/mockActivityData';
import {
  classifyMoneyActivity,
  getMoneyActivityStatus,
  moneyActivityKindToIcon,
  moneyActivityLabel,
  type MoneyActivityKind,
  type MoneyActivityStatus,
} from '../utils/classifyMoneyActivity';

export interface MoneyTransactionDisplayInfo {
  label: string;
  description: string | undefined;
  primaryAmount: string;
  fiatAmount: string;
  isIncoming: boolean;
  icon: IconName;
  status: MoneyActivityStatus;
}

function getMoneySubtitle(tx: TransactionMeta): string | undefined {
  const extended = tx as MoneyActivityTransactionMeta;
  return extended.moneySubtitle;
}

/**
 * Returns the mUSD required asset from a pay transaction, if present. Money
 * deposits declare their target as mUSD on the tx's chain (see
 * `getMoneyAccountDepositAssetAddress`); any other asset is not an amount we
 * can render as mUSD, so it is ignored rather than mis-denominated.
 */
function getMusdRequiredAsset(tx: TransactionMeta): RequiredAsset | undefined {
  return tx.requiredAssets?.find((asset) =>
    isMusdTokenOnChain(asset.address, tx.chainId),
  );
}

/**
 * Formats an mUSD amount as a signed, symbol-suffixed string, e.g.
 * "+1,000.00 mUSD" / "-0.00 mUSD". The sign follows the row's direction.
 */
function formatMusdAmount(amount: BigNumber, isIncoming: boolean): string {
  const formatted = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount.toNumber());
  return `${isIncoming ? '+' : '-'}${formatted} ${MUSD_TOKEN.symbol}`;
}

function prettifyFiatProvider(
  provider: string | undefined,
): string | undefined {
  if (!provider) return undefined;
  const base = provider.split('-')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Gets the subtitle for a Money activity row, by kind. An explicit
 * `moneySubtitle` always wins (mock / enriched rows). Otherwise:
 * - converted → "{token} → mUSD"
 * - sent      → "mUSD → {token}" (the withdraw destination token)
 * - received  → "From: 0x…" (the sender)
 * - deposited → fiat payment method ("Apple Pay"), else provider ("Transak"), else funding token ("mUSD")
 * - card / added / transferred → the source token symbol, if any
 */
function deriveSubtitle(
  kind: MoneyActivityKind,
  tx: TransactionMeta,
  sourceTokenSymbol: string | undefined,
  explicitSubtitle: string | undefined,
  paymentMethodName: string | undefined,
): string | undefined {
  if (explicitSubtitle) {
    return explicitSubtitle;
  }

  // Perps/Predict ↔ Money transfers (either direction) name the service account
  // instead of a token pair / sender.
  const serviceFamily = perpsPredictServiceFamily(tx);
  if (serviceFamily === 'perps') {
    return strings('transaction_details.label.perps_account');
  }
  if (serviceFamily === 'predict') {
    return strings('transaction_details.label.predictions_account');
  }

  switch (kind) {
    case 'converted':
      return sourceTokenSymbol
        ? `${sourceTokenSymbol} → ${MUSD_TOKEN.symbol}`
        : undefined;
    case 'sent': {
      // Prefer the resolved destination token; for a withdrawal (always paid
      // out in USDC) fall back to that known symbol, since the dest token
      // usually isn't in the registry.
      const destSymbol =
        sourceTokenSymbol ??
        (isMoneyWithdrawTx(tx) ? MONEY_WITHDRAW_TOKEN_SYMBOL : undefined);
      // A plain mUSD send (destination is mUSD too) collapses to just "mUSD",
      // mirroring the deposit row; only a cross-token withdrawal keeps the
      // "mUSD → X" pair, where the destination token carries real information.
      return destSymbol && destSymbol !== MUSD_TOKEN.symbol
        ? `${MUSD_TOKEN.symbol} → ${destSymbol}`
        : MUSD_TOKEN.symbol;
    }
    case 'received': {
      const sender = tx.txParams?.from;
      return sender
        ? strings('money.transaction.received_from', {
            address: renderShortAddress(sender),
          })
        : undefined;
    }
    case 'deposited':
      return (
        paymentMethodName ??
        prettifyFiatProvider(tx.metamaskPay?.fiat?.provider) ??
        sourceTokenSymbol
      );
    default:
      return sourceTokenSymbol;
  }
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
  const paymentMethodName = useFiatPaymentMethodName(tx);
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
    // mUSD is registered with the uppercase symbol "MUSD"; canonicalise it to
    // the branded "mUSD" so subtitles never leak the registry casing.
    const sourceTokenSymbol = isMusdToken(payTokenAddress)
      ? MUSD_TOKEN.symbol
      : (payToken?.symbol ?? nativeTicker);
    const kind = classifyMoneyActivity(tx);
    const status = getMoneyActivityStatus(tx);
    const isIncoming = isIncomingMoneyTransactionMeta(tx);

    let primaryAmount = getMusdDisplayAmountFromTransactionMeta(tx);
    if (!primaryAmount) {
      const requiredAsset = getMusdRequiredAsset(tx);
      if (requiredAsset) {
        const musdAmount = new BigNumber(requiredAsset.amount).shiftedBy(
          -MUSD_DECIMALS,
        );
        // Render only amounts visible at 2 decimals: a dust amount would
        // otherwise display as "+0.00 mUSD"
        if (musdAmount.decimalPlaces(2).isGreaterThan(0)) {
          primaryAmount = formatMusdAmount(musdAmount, isIncoming);
        }
        // If there's no mUSD required asset / visible amount, primaryAmount
        // stays empty — the fiatAmount line below still shows the value.
      }
    }

    let fiatAmount = buildMoneyActivityFiatLine(
      tx,
      currencyRates,
      tokenMarketData,
    );
    if (!fiatAmount) {
      const rawFiat = Number(tx.metamaskPay?.targetFiat);
      if (!isNaN(rawFiat) && rawFiat > 0) {
        fiatAmount = `+${moneyFormatUsd(new BigNumber(rawFiat))}`;
      }
    }

    if (status === 'failed') {
      primaryAmount = formatMusdAmount(new BigNumber(0), isIncoming);
      fiatAmount = `${isIncoming ? '+' : '-'}${moneyFormatUsd(
        new BigNumber(0),
      )}`;
    }

    // Perps/Predict ↔ Money transfers carry no `requiredAssets` and aren't token
    // transfers, so neither amount path above resolves. Skip when failed so the
    // signed-zero amount set above is preserved (as for every other failed row).
    if (status !== 'failed' && isPerpsPredictMoneyActivity(tx)) {
      const fiatStr = isPerpsPredictMoneyWithdraw(tx)
        ? tx.metamaskPay?.targetFiat
        : tx.metamaskPay?.totalFiat;
      const fiat = Number(fiatStr);
      if (!isNaN(fiat) && fiat > 0) {
        const amount = new BigNumber(fiat);
        primaryAmount = formatMusdAmount(amount, isIncoming);
        fiatAmount = `${isIncoming ? '+' : '-'}${moneyFormatUsd(amount)}`;
      }
    }

    return {
      label: moneyActivityLabel(kind, status),
      description: deriveSubtitle(
        kind,
        tx,
        sourceTokenSymbol,
        subtitle,
        paymentMethodName,
      ),
      primaryAmount,
      fiatAmount,
      isIncoming,
      icon: moneyActivityKindToIcon(kind),
      status,
    };
  }, [
    tx,
    subtitle,
    paymentMethodName,
    currencyRates,
    tokenMarketData,
    payToken,
    payTokenAddress,
    nativeTicker,
  ]);
}
