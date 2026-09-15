import React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { act, render, renderHook } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';

import configureStore from '../../../../../util/test/configureStore';
import { evmAccountAddress, initialState } from '../../_mocks_/initialState';
import {
  BridgeTabKey,
  TAB_TO_FEATURE_ID,
} from '../../Views/BridgeView/BridgeView.constants';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useSwapsFeatureId } from '../../hooks/useSwapsFeatureId';
import { BridgeSessionProvider } from './index';

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(() => undefined),
}));

const mockUseLatestBalance = jest.mocked(useLatestBalance);

const sourceToken = {
  address: '0x1111111111111111111111111111111111111111',
  decimals: 18,
  chainId: '0x1' as Hex,
  symbol: 'ETH',
  balance: '2.5',
};

const destToken = {
  address: '0x2222222222222222222222222222222222222222',
  decimals: 6,
  chainId: '0x1' as Hex,
  symbol: 'USDC',
};

const mockLatestBalance = {
  displayBalance: '2.5',
  atomicBalance: { toString: () => '2500000000000000000' },
} as ReturnType<typeof useLatestBalance>;

const createState = (
  bridgeOverrides: Partial<(typeof initialState)['bridge']> = {},
) => ({
  ...initialState,
  bridge: {
    ...initialState.bridge,
    sourceToken,
    destToken,
    sourceAmount: '1.25',
    slippage: '0.5',
    destAddress: '0xdest',
    balanceRefreshKey: 7,
    ...bridgeOverrides,
  },
});

const renderSession = (state = createState()) => {
  const store = configureStore(state);

  return renderHook(
    () => ({
      session: useBridgeSession(),
      featureId: useSwapsFeatureId(),
    }),
    {
      wrapper: ({ children }) => (
        <Provider store={store}>
          <BridgeSessionProvider>{children}</BridgeSessionProvider>
        </Provider>
      ),
    },
  );
};

describe('BridgeSessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLatestBalance.mockReturnValue(undefined);
  });

  it('defaults selectedTab and renderedTab to Market', () => {
    const { result } = renderSession();

    expect(result.current.session.selectedTab).toBe(BridgeTabKey.Market);
    expect(result.current.session.renderedTab).toBe(BridgeTabKey.Market);
  });

  it('scopes SwapsFeatureId to UNIFIED_SWAP_BRIDGE on the Market tab', () => {
    const { result } = renderSession();

    expect(result.current.featureId).toBe(FeatureId.UNIFIED_SWAP_BRIDGE);
  });

  it('updates selectedTab without changing renderedTab', () => {
    const { result } = renderSession();

    act(() => {
      result.current.session.setSelectedTab(BridgeTabKey.Limit);
    });

    expect(result.current.session.selectedTab).toBe(BridgeTabKey.Limit);
    expect(result.current.session.renderedTab).toBe(BridgeTabKey.Market);
    expect(result.current.featureId).toBe(FeatureId.UNIFIED_SWAP_BRIDGE);
  });

  it.each([
    BridgeTabKey.Market,
    BridgeTabKey.Limit,
    BridgeTabKey.Recurring,
  ] as const)('maps renderedTab %s to its feature id', (tab) => {
    const { result } = renderSession();

    act(() => {
      result.current.session.setRenderedTab(tab);
    });

    expect(result.current.session.renderedTab).toBe(tab);
    expect(result.current.featureId).toBe(TAB_TO_FEATURE_ID[tab]);
  });

  it('calls useLatestBalance with source token fields and the Market feature id', () => {
    renderSession();

    expect(mockUseLatestBalance).toHaveBeenCalledWith(
      {
        address: sourceToken.address,
        decimals: sourceToken.decimals,
        chainId: sourceToken.chainId,
        balance: sourceToken.balance,
        refreshKey: 7,
      },
      FeatureId.UNIFIED_SWAP_BRIDGE,
    );
  });

  it('passes LIMIT_ORDER to useLatestBalance after renderedTab becomes Limit', () => {
    const { result } = renderSession();

    act(() => {
      result.current.session.setRenderedTab(BridgeTabKey.Limit);
    });

    expect(mockUseLatestBalance).toHaveBeenLastCalledWith(
      {
        address: sourceToken.address,
        decimals: sourceToken.decimals,
        chainId: sourceToken.chainId,
        balance: sourceToken.balance,
        refreshKey: 7,
      },
      FeatureId.LIMIT_ORDER,
    );
  });

  it('passes undefined source token fields when no source token is selected', () => {
    renderSession(
      createState({
        sourceToken: undefined,
        balanceRefreshKey: 1,
      }),
    );

    expect(mockUseLatestBalance).toHaveBeenCalledWith(
      {
        address: undefined,
        decimals: undefined,
        chainId: undefined,
        balance: undefined,
        refreshKey: 1,
      },
      FeatureId.UNIFIED_SWAP_BRIDGE,
    );
  });

  it('exposes latestSourceBalance from useLatestBalance', () => {
    mockUseLatestBalance.mockReturnValue(mockLatestBalance);

    const { result } = renderSession();

    expect(result.current.session.latestSourceBalance).toBe(mockLatestBalance);
  });

  it('builds quoteParams from the bridge session selectors', () => {
    const { result } = renderSession();

    expect(result.current.session.quoteParams).toEqual({
      srcToken: sourceToken,
      destToken,
      srcAmount: '1.25',
      slippage: '0.5',
      walletAddress: evmAccountAddress,
      destWalletAddress: '0xdest',
    });
  });

  it('builds quoteParams with undefined fields when the session is empty', () => {
    const { result } = renderSession(
      createState({
        sourceToken: undefined,
        destToken: undefined,
        sourceAmount: undefined,
        slippage: undefined,
        destAddress: undefined,
      }),
    );

    expect(result.current.session.quoteParams).toEqual({
      srcToken: undefined,
      destToken: undefined,
      srcAmount: undefined,
      slippage: undefined,
      walletAddress: undefined,
      destWalletAddress: undefined,
    });
  });

  it('renders children', () => {
    const store = configureStore(createState());

    const { getByText } = render(
      <Provider store={store}>
        <BridgeSessionProvider>
          <Text>hosted</Text>
        </BridgeSessionProvider>
      </Provider>,
    );

    expect(getByText('hosted')).toBeOnTheScreen();
  });
});
