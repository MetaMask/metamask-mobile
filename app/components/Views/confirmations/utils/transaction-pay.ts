import {
  CHAIN_IDS,
  NestedTransactionMetadata,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionFiatPayment,
  TransactionPayRequiredToken,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';
import { hasTransactionType } from './transaction';
import { Hex } from '@metamask/utils';
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
}: {
  payToken?: TransactionPaymentToken;
  requiredTokens?: TransactionPayRequiredToken[];
  tokens: AssetType[];
  blockedTokens?: BlockedTokensListConfig;
  fiatPayment?: TransactionFiatPayment;
}): AssetType[] {
  const hasFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);

  return tokens
    .filter((token) => {
      if (
        token.standard !== TokenStandard.ERC20 ||
        !token.accountType?.includes('eip155') ||
        (token.chainId && isTestNet(token.chainId))
      ) {
        return false;
      }

      const isSelected =
        payToken?.address.toLowerCase() === token.address.toLowerCase() &&
        payToken?.chainId === token.chainId;

      if (isSelected) {
        return true;
      }

      const isRequiredToken = (requiredTokens ?? []).some(
        (t) =>
          t.address.toLowerCase() === token.address.toLowerCase() &&
          t.chainId === token.chainId &&
          !t.skipIfBalance,
      );

      if (isRequiredToken) {
        return true;
      }

      return new BigNumber(token.balance).gt(0);
    })
    .map((token) => {
      const blocked = isTokenBlocked(token, blockedTokens);

      const disabled = blocked;

      const disabledMessage = blocked
        ? strings('pay_with_modal.not_supported')
        : undefined;

      const isSelected = hasFiatPayment
        ? false
        : payToken?.address.toLowerCase() === token.address.toLowerCase() &&
          payToken?.chainId === token.chainId;

      return {
        ...token,
        disabled,
        disabledMessage,
        isSelected,
      };
    })
    .sort((a, b) => Number(a.disabled) - Number(b.disabled));
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
 * Sets the money account payment override on a transaction and clears any
 * previously selected fiat payment method. For deposit flows the money
 * account address is stored as the refund destination.
 */
export function applyMoneyAccountOverride(
  transactionId: string,
  moneyAccountAddress: string | undefined,
  isWithdraw: boolean,
): void {
  Engine.context.TransactionPayController.setTransactionConfig(
    transactionId,
    (config) => {
      (config as Record<string, unknown>).paymentOverride =
        PaymentOverride.MoneyAccount;
      if (moneyAccountAddress && !isWithdraw) {
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
