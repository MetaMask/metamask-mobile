import '../../../../../util/test/integration/backgroundOnlyMocks';
import { RequestStatus } from '@metamask/bridge-controller';
import { renderIntegrationScreen } from '../../../../../util/test/integration/render';
import { tokenFactory, markNoFeeDestAsset } from './tests/BridgeView.builders';
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

// Simplify accounts hook to avoid heavy AccountsController metadata requirements in tests
jest.mock('../../../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        id: '30786334-3935-4563-b064-363339643939',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Account 1',
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        caipAccountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        scopes: ['eip155:0'],
      },
    ],
    ensByAccountAddress: {
      '0x1234567890123456789012345678901234567890': '',
    },
  }),
}));

describe('BridgeView (background-only)', () => {
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
});
