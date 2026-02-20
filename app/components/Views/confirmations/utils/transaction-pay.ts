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
import {
  getNativeTokenAddress,
  TokenListState,
} from '@metamask/assets-controllers';
import { NetworkConfiguration } from '@metamask/network-controller';

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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface BuildAllowlistDeps {
  tokensChainsCache?: TokenListState['tokensChainsCache'];
  networkConfigs?: Record<string, NetworkConfiguration>;
}

function isNativeAddress(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS;
}

function findHeldToken(
  heldByKey: Map<string, AssetType>,
  chainId: string,
  address: string,
  nativeTokenAddress: Hex,
): AssetType | undefined {
  const chainLower = chainId.toLowerCase();
  const addrLower = address.toLowerCase();

  const direct = heldByKey.get(`${chainLower}:${addrLower}`);
  if (direct) {
    return direct;
  }

  // Native token in the allowlist may use 0x000...000 while held tokens use
  // the chain-specific native address (e.g. 0x...1010 on Polygon).
  if (isNativeAddress(address)) {
    return heldByKey.get(`${chainLower}:${nativeTokenAddress.toLowerCase()}`);
  }

  return undefined;
}

/**
 * Builds a token list from an allowlist, using held tokens when available and
 * falling back to the token catalog for tokens the user doesn't hold.
 * Native tokens (0x000...000) are resolved via getNativeTokenAddress and
 * network config metadata.
 */
export function buildAllowlistTokens(
  heldTokens: AssetType[],
  allowlist: Record<Hex, Hex[]>,
  deps: BuildAllowlistDeps,
): AssetType[] {
  const heldByKey = new Map<string, AssetType>();
  for (const token of heldTokens) {
    if (!token.address || !token.chainId) {
      continue;
    }
    const key = `${(token.chainId as string).toLowerCase()}:${token.address.toLowerCase()}`;
    heldByKey.set(key, token);
  }

  const result: AssetType[] = [];

  for (const [chainId, addresses] of Object.entries(allowlist)) {
    const cacheData = deps.tokensChainsCache?.[chainId as Hex]?.data;
    const nativeAddr = getNativeTokenAddress(chainId as Hex);

    for (const address of addresses) {
      const held = findHeldToken(heldByKey, chainId, address, nativeAddr);

      if (held) {
        result.push(held);
        continue;
      }

      if (isNativeAddress(address)) {
        const networkConfig = deps.networkConfigs?.[chainId];
        if (networkConfig) {
          result.push({
            address: nativeAddr,
            chainId: chainId as Hex,
            name: networkConfig.nativeCurrency,
            symbol: networkConfig.nativeCurrency,
            decimals: 18,
            image: '',
            logo: undefined,
            balance: '0',
            isETH: true,
            isNative: true,
            standard: TokenStandard.ERC20,
          } as AssetType);
        }
        continue;
      }

      const catalogEntry = cacheData?.[address.toLowerCase()];
      if (catalogEntry) {
        result.push({
          address: catalogEntry.address,
          chainId: chainId as Hex,
          name: catalogEntry.name,
          symbol: catalogEntry.symbol,
          decimals: catalogEntry.decimals,
          image: catalogEntry.iconUrl,
          logo: catalogEntry.iconUrl,
          balance: '0',
          isETH: false,
          standard: TokenStandard.ERC20,
        } as AssetType);
      }
    }
  }

  return result;
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
