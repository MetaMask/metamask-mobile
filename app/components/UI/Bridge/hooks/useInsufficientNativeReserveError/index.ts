import {
  ChainId,
  formatChainIdToCaip,
  formatChainIdToHex,
  isBitcoinChainId,
  isNativeAddress,
  isNonEvmChainId,
  type QuoteMetadata,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import { BridgeToken } from '../../types';
import { useSelector } from 'react-redux';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { BigNumber } from 'ethers';
import { BigNumber as BigNumberJS } from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { isHardwareAccount } from '../../../../../util/address';

type ChainIdWithNativeReserve = Hex | CaipChainId;
type ActiveQuote = (QuoteResponse & QuoteMetadata) | null | undefined;

const BTC_MAINNET_CHAIN_ID = formatChainIdToCaip(ChainId.BTC);

const MINIMUM_NATIVE_RESERVE_BALANCE_PER_CHAIN: {
  [key in ChainIdWithNativeReserve]?: string;
} = {
  '0x8f': '10',
  [BTC_MAINNET_CHAIN_ID]: '0.00003',
};

const getMinimumReserveBalanceForTokenChainAndAddress = ({
  chainId,
  tokenAddress,
}: {
  chainId: ChainIdWithNativeReserve;
  tokenAddress: string;
}): string => {
  if (!tokenAddress || !isNativeAddress(tokenAddress)) {
    return '0';
  }
  return MINIMUM_NATIVE_RESERVE_BALANCE_PER_CHAIN[chainId] ?? '0';
};

const toBaseUnitBigNumber = (value: string, decimals: number) => {
  const decimalValue = BigNumberJS(value);
  if (!decimalValue.isFinite()) {
    return undefined;
  }

  const fixedValue = decimalValue.toFixed();
  const decimalIndex = fixedValue.indexOf('.');
  const tokenDecimalValue =
    decimalIndex === -1
      ? fixedValue
      : fixedValue.slice(0, decimalIndex + 1 + decimals);

  return BigNumberJS(parseUnits(tokenDecimalValue, decimals).toString());
};

interface UseInsufficientNativeReserveErrorParams {
  amount?: string;
  token?: BridgeToken;
  latestAtomicBalance?: BigNumber;
  walletAddress?: string;
  activeQuote?: ActiveQuote;
}

/**
 * For networks with a native reserve balance requirement:
 * - gas-sponsored EVM networks, such as Monad which needs 10 MON at all times
 * - BTC mainnet swaps, which keep a buffer for network fees
 */
export const useInsufficientNativeReserveError = ({
  amount,
  token,
  latestAtomicBalance,
  walletAddress,
  activeQuote,
}: UseInsufficientNativeReserveErrorParams) => {
  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );
  const isBitcoinReserveChain = Boolean(
    token?.chainId && isBitcoinChainId(token.chainId),
  );

  if (
    !amount ||
    !token?.address ||
    !token?.chainId ||
    !latestAtomicBalance ||
    !walletAddress ||
    (isNonEvmChainId(token.chainId) && !isBitcoinReserveChain)
  ) {
    return undefined;
  }

  const inputAmount = BigNumberJS(amount);
  if (!inputAmount.isFinite()) {
    return undefined;
  }

  const isHardwareWalletAccount = Boolean(
    walletAddress && isHardwareAccount(walletAddress),
  );

  const chainIdWithNativeReserve = isNonEvmChainId(token.chainId)
    ? token.chainId
    : formatChainIdToHex(token.chainId);
  const chainIdHex = isNonEvmChainId(token.chainId)
    ? undefined
    : formatChainIdToHex(token.chainId);
  const isNetworkGasSponsored = Boolean(
    chainIdHex &&
      !isHardwareWalletAccount &&
      isGasFeesSponsoredNetworkEnabled(chainIdHex),
  );

  const minimumNativeBalanceToBeKeptInAccount =
    isNetworkGasSponsored || isBitcoinReserveChain
      ? getMinimumReserveBalanceForTokenChainAndAddress({
          chainId: chainIdWithNativeReserve,
          tokenAddress: token.address,
        })
      : '0';

  const minimumNativeBalanceToBeKeptInAccountBaseUnits =
    minimumNativeBalanceToBeKeptInAccount !== '0'
      ? toBaseUnitBigNumber(
          minimumNativeBalanceToBeKeptInAccount,
          token.decimals,
        )
      : BigNumberJS(0);

  if (!minimumNativeBalanceToBeKeptInAccountBaseUnits) {
    return undefined;
  }

  let btcQuoteNetworkFeeBaseUnits = BigNumberJS(0);
  let btcQuoteSourceOverheadBaseUnits = BigNumberJS(0);
  if (isBitcoinReserveChain && activeQuote) {
    const networkFeeAmount = activeQuote.totalNetworkFee?.amount;
    const sentAmount = activeQuote.sentAmount?.amount;
    const networkFeeBaseUnits = networkFeeAmount
      ? toBaseUnitBigNumber(networkFeeAmount, token.decimals)
      : undefined;
    const sentAmountBaseUnits = sentAmount
      ? toBaseUnitBigNumber(sentAmount, token.decimals)
      : undefined;
    const inputAmountBaseUnits = toBaseUnitBigNumber(amount, token.decimals);

    if (
      !networkFeeBaseUnits ||
      !sentAmountBaseUnits ||
      !inputAmountBaseUnits ||
      networkFeeBaseUnits.lte(0)
    ) {
      return undefined;
    }

    if (
      networkFeeBaseUnits
        .plus(sentAmountBaseUnits)
        .gte(BigNumberJS(latestAtomicBalance.toString()))
    ) {
      return undefined;
    }

    btcQuoteNetworkFeeBaseUnits = networkFeeBaseUnits;
    btcQuoteSourceOverheadBaseUnits = BigNumberJS.max(
      sentAmountBaseUnits.minus(inputAmountBaseUnits),
      0,
    );
  }

  const maxSwappableNativeBalanceBaseUnits = BigNumberJS.max(
    new BigNumberJS(latestAtomicBalance.toString() ?? '0')
      .minus(minimumNativeBalanceToBeKeptInAccountBaseUnits)
      .minus(btcQuoteNetworkFeeBaseUnits)
      .minus(btcQuoteSourceOverheadBaseUnits),
    0,
  );

  const maxSwappableNativeBalance = BigNumberJS(
    formatUnits(maxSwappableNativeBalanceBaseUnits.toFixed(0), token.decimals),
  );

  return minimumNativeBalanceToBeKeptInAccount !== '0' &&
    maxSwappableNativeBalance.lt(inputAmount)
    ? {
        minimumNativeBalanceToBeKeptInAccount,
        maxSwappableNativeBalance: maxSwappableNativeBalance.toString(),
      }
    : undefined;
};
