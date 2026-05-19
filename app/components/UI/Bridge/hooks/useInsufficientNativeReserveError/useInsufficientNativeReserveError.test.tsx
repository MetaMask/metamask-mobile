import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore, Store } from 'redux';

import { BridgeToken } from '../../types';
import { BigNumber } from 'ethers';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  ChainId,
  type QuoteMetadata,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import { initialState } from '../../_mocks_/initialState';
import { useInsufficientNativeReserveError } from './index';
import { ZERO_ADDRESS } from '../../../../Views/confirmations/constants/address';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';

jest.mock('../../../../../selectors/featureFlagController/gasFeesSponsored');
jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));
import { isHardwareAccount } from '../../../../../util/address';

const mockGetGasFeesSponsoredNetworkEnabled = jest.mocked(
  getGasFeesSponsoredNetworkEnabled,
);
const mockIsHardwareAccount = jest.mocked(isHardwareAccount);

// Helper to create a mock store with proper state structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockStore = (): Store => {
  const rootReducer = (state = initialState) => state;
  return createStore(rootReducer, initialState);
};

// Helper to wrap hook with provider
const wrapper =
  (store: Store) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

const wmonTokenOnMonad: BridgeToken = {
  address: '0x3bd359c1119da7da1d913d1c4d2b7c461115433a', // USDC
  symbol: 'WMON',
  decimals: 18,
  chainId: CHAIN_IDS.MONAD as `0x${string}`,
};

const monTokenOnMonad: BridgeToken = {
  address: ZERO_ADDRESS,
  symbol: 'MON',
  decimals: 18,
  chainId: CHAIN_IDS.MONAD as `0x${string}`,
};

const ethTokenOnMainnet: BridgeToken = {
  address: ZERO_ADDRESS,
  symbol: 'ETH',
  decimals: 18,
  chainId: CHAIN_IDS.MAINNET as `0x${string}`,
};

const btcTokenOnBitcoin: BridgeToken = {
  address: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  symbol: 'BTC',
  decimals: 8,
  chainId: 'bip122:000000000019d6689c085ae165831e93',
};

const nonEvmNativeTokens: BridgeToken[] = [
  {
    address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    decimals: 9,
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  },
  {
    address: 'tron:728126428/slip44:195',
    symbol: 'TRX',
    decimals: 6,
    chainId: 'tron:728126428',
  },
];

type RenderHookCallback<TProps, TResult> = (props: TProps) => TResult;

function renderHookWithWrapper<
  TProps extends { children: React.ReactNode },
  TResult,
>(callback: RenderHookCallback<TProps, TResult>) {
  return renderHook(callback, { wrapper: wrapper(createMockStore()) });
}

const createBtcQuote = ({
  networkFeeAmount = '0.00000001',
  sentAmount = '0.99997',
}: {
  networkFeeAmount?: string;
  sentAmount?: string;
} = {}): QuoteResponse & QuoteMetadata =>
  ({
    ...mockQuoteWithMetadata,
    quote: {
      ...mockQuoteWithMetadata.quote,
      srcChainId: ChainId.BTC,
    },
    sentAmount: {
      ...mockQuoteWithMetadata.sentAmount,
      amount: sentAmount,
    },
    totalNetworkFee: {
      ...mockQuoteWithMetadata.totalNetworkFee,
      amount: networkFeeAmount,
    },
  }) as QuoteResponse & QuoteMetadata;

describe('useInsufficientNativeReserveError', () => {
  beforeEach(() => {
    mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => true);
    mockIsHardwareAccount.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a insufficientNativeReserveError when amount goes beyond reserve', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '45',
        token: monTokenOnMonad,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual({
      maxSwappableNativeBalance: '40',
      minimumNativeBalanceToBeKeptInAccount: '10',
    });
  });

  it('returns a insufficientNativeReserveError when amount goes beyond reserve with bigger amounts', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '499999999995',
        token: monTokenOnMonad,
        latestAtomicBalance: BigNumber.from('500000000000000000000000000000'), // 500000000000
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual({
      maxSwappableNativeBalance: '499999999990',
      minimumNativeBalanceToBeKeptInAccount: '10',
    });
  });

  it('returns a insufficientNativeReserveError even when amount goes beyond balance', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '55',
        token: monTokenOnMonad,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual({
      maxSwappableNativeBalance: '40',
      minimumNativeBalanceToBeKeptInAccount: '10',
    });
  });

  it('returns insufficientNativeReserveError=undefined when amount goes beyond reserve but account is hardware wallet', () => {
    mockIsHardwareAccount.mockReturnValue(true);
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '45',
        token: monTokenOnMonad,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual(undefined);
  });

  it('returns insufficientNativeReserveError=undefined when amount goes beyond reserve but no sponsorship', () => {
    mockGetGasFeesSponsoredNetworkEnabled.mockReturnValue(() => false);
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '45',
        token: monTokenOnMonad,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual(undefined);
  });

  it('returns insufficientNativeReserveError=undefined when amount covers exactly the reserve', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '40',
        token: monTokenOnMonad,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual(undefined);
  });

  it('returns a insufficientNativeReserveError when BTC amount goes beyond reserve', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '0.999995',
        token: btcTokenOnBitcoin,
        latestAtomicBalance: BigNumber.from('100000000'), // 1 BTC
        walletAddress: 'bc1q7m7cq86p5fnz29s3e0nl8g5ep3p5d4rz2f3duz',
      }),
    );

    expect(result.current).toStrictEqual({
      maxSwappableNativeBalance: '0.99997',
      minimumNativeBalanceToBeKeptInAccount: '0.00003',
    });
  });

  it('returns insufficientNativeReserveError=undefined when BTC amount covers exactly the reserve', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '0.99997',
        token: btcTokenOnBitcoin,
        latestAtomicBalance: BigNumber.from('100000000'), // 1 BTC
        walletAddress: 'bc1q7m7cq86p5fnz29s3e0nl8g5ep3p5d4rz2f3duz',
      }),
    );

    expect(result.current).toStrictEqual(undefined);
  });

  it('returns a quote-aware insufficientNativeReserveError for BTC when quote fees consume the reserve', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '0.99997',
        token: btcTokenOnBitcoin,
        latestAtomicBalance: BigNumber.from('100000000'), // 1 BTC
        walletAddress: 'bc1q7m7cq86p5fnz29s3e0nl8g5ep3p5d4rz2f3duz',
        activeQuote: createBtcQuote({
          networkFeeAmount: '0.00000001',
          sentAmount: '0.99997',
        }),
      }),
    );

    expect(result.current).toStrictEqual({
      maxSwappableNativeBalance: '0.99996999',
      minimumNativeBalanceToBeKeptInAccount: '0.00003',
    });
  });

  it('includes BTC source-side quote overhead in the max swappable amount', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '0.99997',
        token: btcTokenOnBitcoin,
        latestAtomicBalance: BigNumber.from('100000000'), // 1 BTC
        walletAddress: 'bc1q7m7cq86p5fnz29s3e0nl8g5ep3p5d4rz2f3duz',
        activeQuote: createBtcQuote({
          networkFeeAmount: '0.00000001',
          sentAmount: '0.999971',
        }),
      }),
    );

    expect(result.current).toStrictEqual({
      maxSwappableNativeBalance: '0.99996899',
      minimumNativeBalanceToBeKeptInAccount: '0.00003',
    });
  });

  it('returns insufficientNativeReserveError=undefined for BTC when gas validation should own the failure', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '0.99997',
        token: btcTokenOnBitcoin,
        latestAtomicBalance: BigNumber.from('100000000'), // 1 BTC
        walletAddress: 'bc1q7m7cq86p5fnz29s3e0nl8g5ep3p5d4rz2f3duz',
        activeQuote: createBtcQuote({
          networkFeeAmount: '0.000031',
          sentAmount: '0.99997',
        }),
      }),
    );

    expect(result.current).toStrictEqual(undefined);
  });

  it('returns insufficientNativeReserveError=undefined when token is not the native one', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '45',
        token: wmonTokenOnMonad,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual(undefined);
  });

  it.each(nonEvmNativeTokens)(
    'returns insufficientNativeReserveError=undefined for non-EVM native token $symbol',
    (token) => {
      const { result } = renderHookWithWrapper(() =>
        useInsufficientNativeReserveError({
          amount: '45',
          token,
          latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
          walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
        }),
      );

      expect(result.current).toStrictEqual(undefined);
    },
  );

  it('returns insufficientNativeReserveError=undefined when token is the native one but on a chain not concered with reserve', () => {
    const { result } = renderHookWithWrapper(() =>
      useInsufficientNativeReserveError({
        amount: '45',
        token: ethTokenOnMainnet,
        latestAtomicBalance: BigNumber.from('50000000000000000000'), // 50
        walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
      }),
    );
    expect(result.current).toStrictEqual(undefined);
  });
});
