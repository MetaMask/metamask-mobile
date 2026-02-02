import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';
import { hasTransactionType } from './transaction';
import { Hex } from '@metamask/utils';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { AssetType, TokenStandard } from '../types/token';
import {
  TransactionPayRequiredToken,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { BigNumber } from 'bignumber.js';
import { isTestNet } from '../../../../util/networks';
import { store } from '../../../../store';
import { selectGasFeeTokenFlags } from '../../../../selectors/featureFlagController/confirmations';
import { strings } from '../../../../../locales/i18n';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

const FOUR_BYTE_TOKEN_TRANSFER = '0xa9059cbb';

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

  return transactionMeta?.txParams?.to as Hex;
}

export function getAvailableTokens({
  payToken,
  requiredTokens,
  tokens,
}: {
  payToken?: TransactionPaymentToken;
  requiredTokens?: TransactionPayRequiredToken[];
  tokens: AssetType[];
}): AssetType[] {
  const supportedGasFeeTokens = getSupportedGasFeeTokens();

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
      const chainId = (token.chainId as Hex) ?? '0x0';

      const nativeToken = tokens.find(
        (t) =>
          t.chainId === chainId && t.address === getNativeTokenAddress(chainId),
      );

      const noNativeBalance =
        !nativeToken || new BigNumber(nativeToken.balance).isZero();

      const isGasStationSupported = supportedGasFeeTokens[chainId]?.includes(
        token.address?.toLowerCase() as Hex,
      );

      const disabled = noNativeBalance && !isGasStationSupported;

      const disabledMessage = disabled
        ? strings('pay_with_modal.no_gas')
        : undefined;

      const isSelected =
        payToken?.address.toLowerCase() === token.address.toLowerCase() &&
        payToken?.chainId === token.chainId;

      return {
        ...token,
        disabled,
        disabledMessage,
        isSelected,
      };
    });
}

function getSupportedGasFeeTokens(): Record<Hex, Hex[]> {
  const state = store.getState();
  const { gasFeeTokens } = selectGasFeeTokenFlags(state);

  return Object.keys(gasFeeTokens).reduce(
    (acc, chainId) => ({
      ...acc,
      [chainId]: gasFeeTokens[chainId as Hex].tokens.map(
        (token) => token.address.toLowerCase() as Hex,
      ),
    }),
    {},
  );
}

export type TokenPayQuoteMetadata = {
  providerId?: string;
  metrics?: { latency?: number };
  quote?: { metrics?: { latency?: number } };
};

export function getTokenPayProviderId(original: unknown): string | undefined {
  const metadata = original as TokenPayQuoteMetadata | undefined;
  return typeof metadata?.providerId === 'string'
    ? metadata.providerId
    : undefined;
}

export function getQuoteLatency(original: unknown): number | undefined {
  const metadata = original as TokenPayQuoteMetadata | undefined;
  return metadata?.metrics?.latency ?? metadata?.quote?.metrics?.latency;
}
