import {
  CHAIN_IDS,
  NestedTransactionMetadata,
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionFiatPayment,
  TransactionPayRequiredToken,
  TransactionPayTotals,
  TransactionPaymentToken,
  isNonEvmPaymentToken,
} from '@metamask/transaction-pay-controller';
import { SolScope } from '@metamask/keyring-api';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';
import { CaipAssetType, Hex, KnownCaipNamespace } from '@metamask/utils';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { AssetType, TokenStandard } from '../types/token';
import { BigNumber } from 'bignumber.js';
import { isTestNet } from '../../../../util/networks';
import {
  BlockedTokensListConfig,
  BlockedTokensConfig,
} from '../../../../selectors/featureFlagController/confirmations';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import { updateAtomicBatchData } from '../../../../util/transaction-controller';
import { MUSD_TOKEN_ADDRESS } from '../../../UI/Earn/constants/musd';
import { isTransactionPayWithdraw } from './transaction';

interface ResolvedPayTokenRequest {
  address: Hex;
  chainId: Hex;
}

const FOUR_BYTE_TOKEN_TRANSFER = '0xa9059cbb';

function toAddressWord(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

/**
 * Replace every occurrence of `oldAddress` (encoded as a 32-byte ABI word)
 * inside the `data` of each nested transaction with `newAddress`, and persist
 * the change via `updateAtomicBatchData`. No-ops when there are no nested
 * transactions or no old address to replace.
 */
export function replaceAccountInNestedTransactions({
  transactionId,
  nestedTransactions,
  oldAddress,
  newAddress,
}: {
  transactionId: string;
  nestedTransactions: NestedTransactionMetadata[] | undefined;
  oldAddress: string | undefined;
  newAddress: string;
}): void {
  if (!oldAddress || !nestedTransactions?.length) {
    return;
  }

  const oldWord = toAddressWord(oldAddress);
  const newWord = toAddressWord(newAddress);

  if (oldWord === newWord) {
    return;
  }

  nestedTransactions.forEach((nested, index) => {
    const data = nested.data;
    if (!data) {
      return;
    }

    const lowerData = data.toLowerCase();
    if (!lowerData.includes(oldWord)) {
      return;
    }

    const newData = lowerData.split(oldWord).join(newWord) as Hex;

    updateAtomicBatchData({
      transactionId,
      transactionIndex: index,
      transactionData: newData,
    }).catch((error) => {
      Logger.error(error, 'Failed to update account in nested transaction');
    });
  });
}

export function getRequiredBalance(
  transactionMeta: TransactionMeta,
): number | undefined {
  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    return PERPS_MINIMUM_DEPOSIT;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return PREDICT_MINIMUM_DEPOSIT;
  }

  return undefined;
}

export function getTokenTransferData(
  transactionMeta: TransactionMeta | undefined,
):
  | {
      data: Hex;
      to: Hex;
      index?: number;
    }
  | undefined {
  const { nestedTransactions, txParams } = transactionMeta ?? {};
  const { data: singleData } = txParams ?? {};
  const singleTo = txParams?.to as Hex | undefined;

  if (singleData?.startsWith(FOUR_BYTE_TOKEN_TRANSFER) && singleTo) {
    return { data: singleData as Hex, to: singleTo, index: undefined };
  }

  const nestedCallIndex = nestedTransactions?.findIndex((call) =>
    call.data?.startsWith(FOUR_BYTE_TOKEN_TRANSFER),
  );

  const nestedCall =
    nestedCallIndex !== undefined
      ? nestedTransactions?.[nestedCallIndex]
      : undefined;

  if (nestedCall?.data && nestedCall.to) {
    return {
      data: nestedCall.data,
      to: nestedCall.to,
      index: nestedCallIndex,
    };
  }

  return undefined;
}

export function getTokenAddress(
  transactionMeta: TransactionMeta | undefined,
): Hex {
  const nestedCall = transactionMeta && getTokenTransferData(transactionMeta);

  if (nestedCall) {
    return nestedCall.to;
  }

  const requiredAssetAddress = transactionMeta?.requiredAssets?.[0]?.address;
  if (requiredAssetAddress) {
    return requiredAssetAddress;
  }

  return transactionMeta?.txParams?.to as Hex;
}

export function getAvailableTokens({
  payToken,
  requiredTokens,
  tokens,
  blockedTokens,
  fiatPayment,
  isSolanaPayEnabled = false,
}: {
  payToken?: TransactionPaymentToken;
  requiredTokens?: TransactionPayRequiredToken[];
  tokens: AssetType[];
  blockedTokens?: BlockedTokensListConfig;
  fiatPayment?: TransactionFiatPayment;
  /** Whether Solana SOL and SPL balances may be offered as new sources. */
  isSolanaPayEnabled?: boolean;
}): AssetType[] {
  const hasFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);

  return tokens
    .flatMap((token): AssetType[] => {
      if (isSolanaPayAsset(token)) {
        const isSelected = isSelectedPayToken(token, payToken);

        // Solana assets carry no address, so the CAIP-19 asset ID stands in
        // for it wherever the token list compares addresses.
        return isSelected ||
          (isSolanaPayEnabled && new BigNumber(token.balance).gt(0))
          ? [{ ...token, address: token.assetId }]
          : [];
      }

      if (
        !token.address ||
        token.standard !== TokenStandard.ERC20 ||
        !token.accountType?.includes('eip155') ||
        (token.chainId && isTestNet(token.chainId))
      ) {
        return [];
      }

      if (isSelectedPayToken(token, payToken)) {
        return [token];
      }

      const isRequiredToken = (requiredTokens ?? []).some(
        (t) =>
          t.address.toLowerCase() === token.address.toLowerCase() &&
          t.chainId === token.chainId &&
          !t.skipIfBalance,
      );

      if (isRequiredToken) {
        return [token];
      }

      return new BigNumber(token.balance).gt(0) ? [token] : [];
    })
    .map((token) => {
      const blocked = isTokenBlocked(token, blockedTokens);

      const disabled = blocked;

      const disabledMessage = blocked
        ? strings('pay_with_modal.not_supported')
        : undefined;

      const isSelected = hasFiatPayment
        ? false
        : isSelectedPayToken(token, payToken);

      return {
        ...token,
        disabled,
        disabledMessage,
        isSelected,
      };
    })
    .sort((a, b) => Number(a.disabled) - Number(b.disabled));
}

/**
 * Stable identity of a payment token: CAIP-19 asset and wallet account for
 * non-EVM tokens, lowercase chain and address for EVM tokens.
 *
 * @param token - Payment token.
 * @returns Identity key, or an empty string when no token is selected.
 */
export function getPaymentTokenKey(
  token: TransactionPaymentToken | undefined,
): string {
  if (!token) {
    return '';
  }

  if (isNonEvmPaymentToken(token)) {
    return `${token.walletAccountId}:${token.assetId}`;
  }

  return `${token.chainId.toLowerCase()}:${token.address.toLowerCase()}`;
}

/**
 * Whether a token-list asset is a Solana mainnet SOL or SPL balance held by a
 * Solana account, which MetaMask Pay can use as a non-EVM payment source.
 *
 * @param token - Token-list asset.
 * @returns True for Solana SOL and SPL assets.
 */
export function isSolanaPayAsset(
  token: AssetType,
): token is AssetType & { accountId: string; assetId: CaipAssetType } {
  return (
    token.chainId === SolScope.Mainnet &&
    Boolean(token.accountId) &&
    Boolean(token.accountType?.startsWith(`${KnownCaipNamespace.Solana}:`)) &&
    (token.assetId === `${SolScope.Mainnet}/slip44:501` ||
      Boolean(token.assetId?.startsWith(`${SolScope.Mainnet}/token:`)))
  );
}

/**
 * Whether a token-list asset is the selected payment token. Non-EVM tokens
 * match on CAIP-19 asset ID and wallet account; EVM tokens on address and
 * chain.
 *
 * @param token - Token-list asset.
 * @param payToken - Selected payment token.
 * @returns True when the asset is the selected payment token.
 */
export function isSelectedPayToken(
  token: AssetType,
  payToken: TransactionPaymentToken | undefined,
): boolean {
  if (!payToken) {
    return false;
  }

  if (isNonEvmPaymentToken(payToken)) {
    return (
      token.assetId === payToken.assetId &&
      token.accountId === payToken.walletAccountId
    );
  }

  return (
    payToken.address.toLowerCase() === token.address?.toLowerCase() &&
    payToken.chainId === token.chainId
  );
}

export function getBlockedTokensForTransactionType(
  blockedTokens: BlockedTokensConfig,
  transactionType?: string,
): BlockedTokensListConfig {
  const config =
    transactionType && blockedTokens.overrides[transactionType]
      ? blockedTokens.overrides[transactionType]
      : blockedTokens.default;

  return {
    chainIds: config.chainIds ?? [],
    tokens: config.tokens ?? [],
  };
}

export function isTokenBlocked(
  token: { address: string; chainId?: string },
  blockedConfig?: BlockedTokensListConfig,
): boolean {
  if (blockedConfig === undefined || blockedConfig === null) {
    return false;
  }

  if (
    token.chainId &&
    blockedConfig.chainIds.some(
      (id) => id.toLowerCase() === token.chainId?.toLowerCase(),
    )
  ) {
    return true;
  }

  return blockedConfig.tokens.some(
    (blocked) =>
      blocked.address.toLowerCase() === token.address.toLowerCase() &&
      blocked.chainId.toLowerCase() === token.chainId?.toLowerCase(),
  );
}

export function isMatchingPayToken(
  token: { address?: string; chainId?: string } | undefined,
  target: { address: string; chainId: string } | undefined,
): boolean {
  if (!token || !target) {
    return false;
  }
  return (
    token.address?.toLowerCase() === target.address.toLowerCase() &&
    token.chainId?.toLowerCase() === target.chainId.toLowerCase()
  );
}

/**
 * Resolves the preferred pay token for a transaction.
 *
 * Returns the explicit override when provided. Otherwise, falls back to
 * mUSD on Monad for moneyAccountWithdraw transactions so the preferred-token
 * row in the pay-with bottom sheet reflects the withdraw-default asset.
 *
 */
export function resolvePreferredPayToken({
  override,
  transactionMeta,
}: {
  override?: ResolvedPayTokenRequest;
  transactionMeta: TransactionMeta | undefined;
}): ResolvedPayTokenRequest | undefined {
  if (override) {
    return override;
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.moneyAccountWithdraw])
  ) {
    return {
      address: MUSD_TOKEN_ADDRESS,
      chainId: CHAIN_IDS.MONAD,
    };
  }

  return undefined;
}

/**
 * Sets the Money Account payment override on a transaction and clears any
 * previously selected fiat payment method.
 *
 * `paymentOverride` is set unconditionally; the additional flow-specific
 * fields are set only for the flows that need them.
 *
 * Perps/Predict withdraw → MA sets `atomic: false` so the post-Relay transfer
 * to the Money Account runs in `submitPostNonAtomic`. The quote recipient is
 * derived by the pay controller via the `getPaymentOverrideData` callback.
 * Deposit-direction flows funded by the Money Account (Money Account, Perps,
 * and Predict deposits) set `refundTo: MA` so failed Relay bridges refund to
 * the MA rather than the funding EOA. Money Account deposits additionally
 * flip `atomic: false` later via `useTransactionCustomAmount`'s `setIsMax`
 * when the user toggles max amount.
 *
 * Money Account withdraw (`moneyAccountWithdraw`) keeps the default atomic
 * path with no recipient override: `processTransactions` overwrites the quote
 * recipient with the actual token-transfer target from the nested batch.
 */
export function applyMoneyAccountOverride(
  transactionId: string,
  moneyAccountAddress: string | undefined,
  transactionMeta: TransactionMeta | undefined,
): void {
  const isPerpsOrPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
    TransactionType.predictWithdraw,
  ]);
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);

  Engine.context.TransactionPayController.setTransactionConfig(
    transactionId,
    (config) => {
      config.paymentOverride = PaymentOverride.MoneyAccount;
      if (isPerpsOrPredictWithdraw) {
        config.atomic = false;
      }
      if (!isWithdraw && moneyAccountAddress) {
        config.refundTo = moneyAccountAddress as Hex;
      }
    },
  );

  Engine.context.TransactionPayController.updateFiatPayment({
    transactionId,
    callback: (fp) => {
      fp.selectedPaymentMethodId = undefined;
    },
  });
}

export function getTotalPayFeesUsd(
  fees: TransactionPayTotals['fees'],
): BigNumber {
  return new BigNumber(fees.provider?.usd ?? 0)
    .plus(fees.sourceNetwork?.estimate?.usd ?? 0)
    .plus(fees.targetNetwork?.usd ?? 0)
    .plus(fees.metaMask?.usd ?? 0);
}

/**
 * String form of a confirmation asset's display-currency balance.
 *
 * Pay-with rows format this amount with `$`. It is the number behind
 * `balanceInSelectedCurrency`, which pay flows already price in USD.
 * `fiat.balance` stays in the user's preferred currency. Returns `'0'` when
 * the amount is missing.
 */
export function payBalanceUsd(amount: number | undefined): string {
  if (amount === undefined || !Number.isFinite(amount)) {
    return '0';
  }

  return String(amount);
}

/**
 * Truncates a fiat amount to two decimals for rendering and for the keypad
 * buffer, since the stored amount carries full precision so that Max spends
 * the entire balance.
 *
 * Truncates rather than rounds because the result is re-typable: the user can
 * read the value off the screen and enter it back through the keypad, and
 * rounding up would produce an amount greater than the balance.
 *
 * Amounts already within two decimals are returned as-is, so keypad input
 * renders exactly as typed and a mid-edit `12.` is never rewritten to `12.00`.
 */
export function formatAmountForDisplay(amountFiat: string): string {
  const separatorIndex = amountFiat.search(/[.,]/u);

  if (separatorIndex === -1) {
    return amountFiat;
  }

  const decimalCount = amountFiat.length - separatorIndex - 1;

  if (decimalCount <= 2) {
    return amountFiat;
  }

  const value = new BigNumber(amountFiat.replace(',', '.'));

  return value.isFinite() ? value.toFixed(2, BigNumber.ROUND_DOWN) : amountFiat;
}
