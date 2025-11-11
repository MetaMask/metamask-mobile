import '../../../../../util/test/integration/backgroundOnlyMocks';
import React from 'react';
import { RequestStatus } from '@metamask/bridge-controller';
import {
  renderIntegrationScreen,
  renderIntegrationScreenWithRoutes,
} from '../../../../../util/test/integration/render';
import { tokenFactory, markNoFeeDestAsset } from './tests/BridgeView.builders';
import { ethToken2Address } from '../../_mocks_/initialState';
import { createBridgeTestState } from '../../testUtils';
import { strings } from '../../../../../../locales/i18n';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../types';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { setupIntegrationNetworkInterceptors } from '../../../../../util/test/integration/network';
import BridgeView from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { Text } from 'react-native';
import { fireEvent, waitFor, within } from '@testing-library/react-native';

// Background-only mocks installed via backgroundOnlyMocks

// Install default network interceptors for integration tests
let restoreNetwork: (() => void) | undefined;
beforeAll(() => {
  restoreNetwork = setupIntegrationNetworkInterceptors();
});
afterAll(() => {
  restoreNetwork?.();
  restoreNetwork = undefined;
});

// Address helpers mocked via backgroundOnlyMocks

// Avoid heavy UI/effects from QuoteDetailsCard when activeQuote is present
jest.mock('../../components/QuoteDetailsCard', () => ({
  __esModule: true,
  default: () => null,
}));

// Stabilize Blockaid validation to avoid effect loops due to changing function identity
jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => {
  const React = jest.requireActual('react');
  const { useCallback } = React;
  function useValidateBridgeTx() {
    const validateBridgeTx = useCallback(async () => ({ status: 'OK' }), []);
    return { validateBridgeTx };
  }
  return {
    __esModule: true,
    default: useValidateBridgeTx,
  };
});

// Ensure no-fee assets selector returns mUSD when targeting eip155:1
jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    selectBridgeQuotes: jest.fn(),
    selectNoFeeAssets: jest.fn(),
  };
});

// For navigation tests we register destination routes in a local Stack,
// so we don't mock navigation; we assert by rendered route content instead.

// Note: We avoid mocking useAccounts to keep background-only. initialState provides required metadata.

describe('BridgeView (background-only)', () => {
  interface ModalRoute { route?: { params?: { screen?: string } } }
  const bridgeSliceMock = jest.requireMock(
    '../../../../../core/redux/slices/bridge',
  );
  beforeEach(() => {
    jest.clearAllMocks();
    // Keep bridge quotes selector returning undefined by default (no active quote)
    bridgeSliceMock.selectBridgeQuotes.mockReset();
    bridgeSliceMock.selectBridgeQuotes.mockImplementation(() => ({
      activeQuote: undefined,
      recommendedQuote: undefined,
      isLoading: false,
    }));
    // Default no-fee assets: empty
    bridgeSliceMock.selectNoFeeAssets.mockReset();
    bridgeSliceMock.selectNoFeeAssets.mockImplementation(() => []);
  });

  it('navigates to source token selector on press', async () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
    });
    const ModalRootProbe: React.FC<unknown> = (props) => {
      const { route } = (props as ModalRoute) ?? {};
      // eslint-disable-next-line react-native/no-raw-text
      return <Text testID="modal-root-probe">{route?.params?.screen}</Text>;
    };
    const { getByTestId, findByText } = renderIntegrationScreenWithRoutes(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      [{ name: Routes.BRIDGE.MODALS.ROOT, Component: ModalRootProbe }],
      { state },
    );
    fireEvent.press(getByTestId('source-token-area'));
    expect(
      await findByText(Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR),
    ).toBeTruthy();
  });

  it('navigates to dest token selector on press', async () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });
    const ModalRootProbe: React.FC<unknown> = (props) => {
      const { route } = (props as ModalRoute) ?? {};
      // eslint-disable-next-line react-native/no-raw-text
      return <Text testID="modal-root-probe">{route?.params?.screen}</Text>;
    };
    const { getByTestId, findByText } = renderIntegrationScreenWithRoutes(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      [{ name: Routes.BRIDGE.MODALS.ROOT, Component: ModalRootProbe }],
      { state },
    );
    fireEvent.press(getByTestId('dest-token-area'));
    expect(
      await findByText(Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR),
    ).toBeTruthy();
  });

  it('updates amount with keypad input and reflects fiat value', async () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        sourceAmount: '0',
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });
    const { getByTestId, queryByTestId, findByText, findByDisplayValue } =
      renderIntegrationScreen(
        BridgeView,
        { name: Routes.BRIDGE.ROOT },
        { state },
      );
    // If an error banner is visible, close it so the keypad becomes visible
    const closeBanner = queryByTestId('banner-close-button-icon');
    if (closeBanner) {
      fireEvent.press(closeBanner);
    }
    // Ensure keypad is visible
    await waitFor(() => {
      expect(queryByTestId('keypad-delete-button')).toBeTruthy();
    });
    // Type 9.5 using keypad buttons scoped within the keypad container
    const scroll = getByTestId('bridge-view-scroll');
    fireEvent.press(within(scroll).getByText('9'));
    fireEvent.press(within(scroll).getByText('.'));
    fireEvent.press(within(scroll).getByText('5'));
    // Assert amount and fiat
    expect(await findByDisplayValue('9.5')).toBeTruthy();
    expect(await findByText('$19,000.00')).toBeTruthy();
  });

  it('sets amount to max when pressing Max for ERC-20', async () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        sourceToken: tokenFactory(ethToken2Address, {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });
    const { findByText, findByDisplayValue } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    const maxBtn = await findByText('Max');
    fireEvent.press(maxBtn);
    expect(await findByDisplayValue('2')).toBeTruthy();
  });

  it('switches source and dest tokens when pressing switch button', async () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
        destToken: tokenFactory('USDC', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });
    const { getByTestId, findAllByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    fireEvent.press(getByTestId('arrow-button'));
    await waitFor(async () => {
      const usdcLabels = await findAllByText('USDC');
      expect(usdcLabels.length).toBeGreaterThan(0);
    });
  });
  it('renders initial UI with background mocked only', () => {
    // Arrange: Compose state with fetched status to avoid loading UI
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        // Ensure no amount so the UI shows the Select amount state
        sourceAmount: undefined,
        // Set a simple native ETH as source token to exercise balance path without typing
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
        destToken: undefined,
      },
    });

    // Act: Render screen with real providers/hooks
    const { getByTestId } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );

    // Assert: Source input is present (lightweight initial UI assertion)
    expect(getByTestId('source-token-area-input')).toBeTruthy();
  });

  it('shows no MM fee disclaimer when dest token is mUSD and fee is 0', async () => {
    const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;

    // Clone and enforce 0 bps fee on the active quote
    const active = {
      ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
    };
    const currentQuote = (active.quote as Record<string, unknown>) ?? {};
    active.quote = {
      ...currentQuote,
      // Only need metabridge fee information for this test
      feeData: {
        metabridge: { quoteBpsFee: 0 },
      },
      gasIncluded: true,
      srcChainId: 1,
      destChainId: 1,
    };

    // Build base state with Engine + Bridge controller overrides
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotesLastFetched: Date.now(),
      },
      bridgeReducerOverrides: {
        sourceAmount: '1.0',
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
        destToken: tokenFactory('mUSD', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });

    // Force the selector to return a stable recommendedQuote/activeQuote reference
    bridgeSliceMock.selectBridgeQuotes.mockImplementation(() => ({
      activeQuote: active,
      recommendedQuote: active,
      isLoading: false,
    }));

    // Ensure no-fee assets include mUSD on mainnet
    bridgeSliceMock.selectNoFeeAssets.mockImplementation(
      (_state: unknown, _chainId: unknown) => [musdAddress],
    );

    // Mark mUSD as no fee asset for eip155:1 in remote feature flags
    const updatedState = markNoFeeDestAsset(
      state as unknown as DeepPartial<RootState>,
      'eip155:1',
      musdAddress,
    ) as DeepPartial<RootState>;

    const { findByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state: updatedState },
    );

    const expected = strings('bridge.no_mm_fee_disclaimer', {
      destTokenSymbol: 'mUSD',
    });

    expect(await findByText(expected)).toBeTruthy();
  });

  it('hides Max button for native token', () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });

    const { queryByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    expect(queryByText('Max')).toBeNull();
  });

  it('shows Max button for ERC-20 token', async () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        // Use a token address present in TokenBalancesController to ensure balance is available
        sourceToken: tokenFactory(ethToken2Address, {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });

    const { findByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    expect(await findByText('Max')).toBeTruthy();
  });

  it('displays "Select amount" when no amount is entered', () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [],
        quotesLastFetched: 1,
      },
      bridgeReducerOverrides: {
        sourceAmount: undefined,
      },
    });
    const { getByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    expect(getByText('Select amount')).toBeTruthy();
  });

  it('displays "Fetching quote" when quotes are loading and there is no active quote', () => {
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.LOADING,
        quotesLastFetched: null,
        quotes: [],
      },
    });
    const { getByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    expect(getByText('Fetching quote')).toBeTruthy();
  });

  it('displays "Insufficient funds" when amount exceeds balance', async () => {
    // Seed controller with a non-gas-included quote so insufficient funds label is evaluated
    const active = {
      ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
    };
    const currentQuote = (active.quote as Record<string, unknown>) ?? {};
    active.quote = {
      ...currentQuote,
      gasIncluded: false,
      gasFee: { effective: { amount: '0' } } as unknown as Record<
        string,
        unknown
      >,
      srcChainId: 1,
      destChainId: 1,
    };
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quoteRequest: { insufficientBal: true } as unknown as Record<
          string,
          unknown
        >,
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotes: [active as unknown as never],
        quotesLastFetched: 12,
      },
      bridgeReducerOverrides: {
        // Higher than mocked ERC-20 balance (2 tokens via eth_call)
        sourceAmount: '10.0',
        sourceToken: tokenFactory(ethToken2Address, {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
        destToken: tokenFactory('USDC', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });
    // Ensure bottom content renders the button (requires an activeQuote)
    bridgeSliceMock.selectBridgeQuotes.mockImplementation(() => ({
      activeQuote: active as unknown as Record<string, unknown>,
      recommendedQuote: active as unknown as Record<string, unknown>,
      isLoading: false,
    }));
    const { findByText } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    expect(await findByText('Insufficient funds')).toBeTruthy();
  });

  it('shows Continue button when amount is valid and a quote is available', async () => {
    const active = {
      ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
    };
    const currentQuote = (active.quote as Record<string, unknown>) ?? {};
    active.quote = {
      ...currentQuote,
      gasIncluded: true,
      srcChainId: 1,
      destChainId: 1,
    };
    const state = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotesLastFetched: 12,
        quotes: [active as unknown as never],
      },
      bridgeReducerOverrides: {
        sourceAmount: '1.0',
        sourceToken: tokenFactory('ETH', {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
        destToken: tokenFactory(ethToken2Address, {
          chainId: '0x1' as Hex,
        }) as unknown as BridgeToken,
      },
    });
    // Expose activeQuote to the view via selector to avoid timing issues
    bridgeSliceMock.selectBridgeQuotes.mockImplementation(() => ({
      activeQuote: active as unknown as Record<string, unknown>,
      recommendedQuote: active as unknown as Record<string, unknown>,
      isLoading: false,
    }));
    const { findByTestId } = renderIntegrationScreen(
      BridgeView,
      { name: Routes.BRIDGE.ROOT },
      { state },
    );
    expect(await findByTestId('bridge-confirm-button')).toBeTruthy();
  });
});
