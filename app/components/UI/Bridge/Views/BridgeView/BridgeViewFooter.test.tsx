import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { waitFor } from '@testing-library/react-native';
import { BridgeViewFooter } from './BridgeViewFooter';
import { strings } from '../../../../../../locales/i18n';
import { SolScope } from '@metamask/keyring-api';
import {
  RequestStatus,
  type QuoteResponse,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { isHardwareAccount } from '../../../../../util/address';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { createBridgeTestState } from '../../testUtils';
import type { RootState } from '../../../../../reducers';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';

jest.mock(
  '../../../../../multichain-accounts/controllers/account-tree-controller',
  () => ({
    accountTreeControllerInit: jest.fn(() => ({
      controller: {
        state: { accountTree: { wallets: {} } },
      },
    })),
  }),
);

jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

// Mock SwapsConfirmButton to isolate footer-specific behaviour from its own
// dependencies (Engine, useNavigation, useSubmitBridgeTx, …).
jest.mock('../../components/SwapsConfirmButton/index.tsx', () => ({
  SwapsConfirmButton: ({ testID }: { testID?: string }) => {
    const MockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return MockReact.createElement(View, {
      testID: testID ?? 'bridge-confirm-button',
    });
  },
}));

// Mock ApprovalTooltip to avoid the navigation dependency of useTooltipModal.
jest.mock('../../components/ApprovalText', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      MockReact.createElement(View, { testID: 'approval-tooltip' }),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockLocation = MetaMetricsSwapsEventSource.MainView;

/**
 * Builds a Redux state that satisfies all BridgeViewFooter render conditions:
 * active quote, valid source amount, and a quotesLastFetched timestamp.
 */
function buildActiveQuoteState(
  overrides: {
    bridgeControllerOverrides?: Record<string, unknown>;
    bridgeReducerOverrides?: Record<string, unknown>;
  } = {},
) {
  return createBridgeTestState({
    bridgeControllerOverrides: {
      quotesLoadingStatus: RequestStatus.FETCHED,
      quotes: [mockQuoteWithMetadata as unknown as QuoteResponse],
      quotesLastFetched: Date.now(),
      ...(overrides.bridgeControllerOverrides ?? {}),
    },
    bridgeReducerOverrides: {
      sourceAmount: '1.0',
      sourceToken: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1' as Hex,
        decimals: 18,
        image: '',
        name: 'Ether',
        symbol: 'ETH',
      },
      ...(overrides.bridgeReducerOverrides ?? {}),
    },
  });
}

function renderFooter(state: DeepPartial<RootState>) {
  return renderWithProvider(
    <BridgeViewFooter
      location={mockLocation}
      latestSourceBalance={undefined}
    />,
    { state },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BridgeViewFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => mockUseBridgeQuoteData);
  });

  describe('Rendering conditions', () => {
    it('renders nothing when loading without an active quote', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: true,
          activeQuote: null,
        }));

      const { queryByTestId } = renderFooter(buildActiveQuoteState());

      expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
    });

    it('renders nothing when there is no active quote', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: false,
          activeQuote: null,
        }));

      const { queryByTestId } = renderFooter(buildActiveQuoteState());

      expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
    });

    it('renders nothing when source amount is missing', () => {
      const state = buildActiveQuoteState({
        bridgeReducerOverrides: { sourceAmount: undefined },
      });

      const { queryByTestId } = renderFooter(state);

      expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
    });

    it('renders nothing when quotesLastFetched is null', () => {
      const state = buildActiveQuoteState({
        bridgeControllerOverrides: { quotesLastFetched: null },
      });

      const { queryByTestId } = renderFooter(state);

      expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
    });

    it('renders confirm button when all conditions are met', async () => {
      const { getByTestId } = renderFooter(buildActiveQuoteState());

      await waitFor(() => {
        expect(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeTruthy();
      });
    });
  });

  describe('Hardware Wallet Banner', () => {
    it('displays hardware wallet not supported banner when using hardware wallet with Solana source', async () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: { insufficientBal: false },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuoteWithMetadata as unknown as QuoteResponse],
          quotesLastFetched: Date.now(),
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
        },
      });

      const { getByText } = renderFooter(testState as DeepPartial<RootState>);

      await waitFor(() => {
        expect(
          getByText(strings('bridge.hardware_wallet_not_supported_solana')),
        ).toBeTruthy();
      });
    });

    it('does not display hardware wallet banner for regular accounts with Solana source', () => {
      jest.mocked(isHardwareAccount).mockReturnValue(false);

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuoteWithMetadata as unknown as QuoteResponse],
          quotesLastFetched: Date.now(),
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
        },
      });

      const { queryByText } = renderFooter(testState as DeepPartial<RootState>);

      expect(
        queryByText(strings('bridge.hardware_wallet_not_supported_solana')),
      ).toBeNull();
    });
  });

  describe('Blockaid Security Alert', () => {
    it('displays blockaid error banner when blockaid error exists', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          blockaidError: 'This transaction may be a security risk',
          activeQuote: mockQuoteWithMetadata,
        }));

      const { getByText } = renderFooter(buildActiveQuoteState());

      await waitFor(() => {
        expect(getByText(strings('bridge.blockaid_error_title'))).toBeTruthy();
        expect(
          getByText('This transaction may be a security risk'),
        ).toBeTruthy();
      });
    });

    it('does not display blockaid banner when there is no blockaid error', () => {
      const { queryByText } = renderFooter(buildActiveQuoteState());

      expect(queryByText(strings('bridge.blockaid_error_title'))).toBeNull();
    });
  });

  describe('Fee Disclaimer', () => {
    it('shows fee disclaimer with fee percentage when fee is greater than zero', async () => {
      const feePercentage = 0.875; // quoteBpsFee: 87.5 / 100

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: {
            ...mockQuoteWithMetadata,
            // @ts-expect-error controller types are not up to date yet
            quote: { feeData: { metabridge: { quoteBpsFee: 87.5 } } },
          },
        }));

      const { getByText } = renderFooter(buildActiveQuoteState());

      await waitFor(() => {
        expect(
          getByText(strings('bridge.fee_disclaimer', { feePercentage }), {
            exact: false,
          }),
        ).toBeTruthy();
      });
    });

    it('shows no MM fee disclaimer when dest token is mUSD and fee is zero', async () => {
      const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: false,
          activeQuote: {
            ...(mockQuoteWithMetadata as unknown as QuoteResponse),
            // @ts-expect-error controller types are not up to date yet
            quote: { feeData: { metabridge: { quoteBpsFee: 0 } } },
          } as unknown as QuoteResponse,
        }));

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuoteWithMetadata as unknown as QuoteResponse],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1' as Hex,
            decimals: 18,
            image: '',
            name: 'Ether',
            symbol: 'ETH',
          },
          destToken: {
            address: musdAddress,
            chainId: '0x1' as Hex,
            decimals: 6,
            image: '',
            name: 'MetaMask USD',
            symbol: 'mUSD',
          },
        },
      });

      const { getByText } = renderFooter(testState as DeepPartial<RootState>);

      await waitFor(() => {
        expect(
          getByText(
            strings('bridge.no_mm_fee_disclaimer', { destTokenSymbol: 'mUSD' }),
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Approval Disclaimer', () => {
    it('displays approval needed text when quote requires approval', async () => {
      const mockQuote = {
        ...mockQuoteWithMetadata,
        approval: {
          chainId: '0x1',
          to: '0xToken',
          data: '0xApprovalData',
        },
      };

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
        }));

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote as unknown as QuoteResponse],
          quotesLastFetched: Date.now(),
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.5',
          sourceToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1' as Hex,
            decimals: 6,
            image: '',
            name: 'USD Coin',
            symbol: 'USDC',
          },
        },
      });

      const { getByText } = renderFooter(testState as DeepPartial<RootState>);

      await waitFor(() => {
        const approvalText = strings('bridge.approval_needed', {
          amount: '1.5',
          symbol: 'USDC',
        });
        expect(getByText(approvalText, { exact: false })).toBeTruthy();
      });
    });

    it('displays approval tooltip when quote requires approval', async () => {
      const mockQuote = {
        ...mockQuoteWithMetadata,
        approval: {
          chainId: '0x1',
          to: '0xToken',
          data: '0xApprovalData',
        },
      };

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
        }));

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote as unknown as QuoteResponse],
          quotesLastFetched: Date.now(),
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.5',
          sourceToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1' as Hex,
            decimals: 6,
            image: '',
            name: 'USD Coin',
            symbol: 'USDC',
          },
        },
      });

      const { getByTestId } = renderFooter(testState as DeepPartial<RootState>);

      await waitFor(() => {
        expect(getByTestId('approval-tooltip')).toBeTruthy();
      });
    });

    it('does not display approval text when quote does not require approval', async () => {
      const mockQuote = {
        ...mockQuoteWithMetadata,
        approval: null,
      };

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
        }));

      const { queryByText } = renderFooter(buildActiveQuoteState());

      await waitFor(() => {
        expect(queryByText(/approval needed/i, { exact: false })).toBeNull();
      });
    });

    it('does not display approval tooltip when quote does not require approval', async () => {
      const mockQuote = {
        ...mockQuoteWithMetadata,
        approval: null,
      };

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
        }));

      const { queryByTestId } = renderFooter(buildActiveQuoteState());

      await waitFor(() => {
        expect(queryByTestId('approval-tooltip')).toBeNull();
      });
    });
  });
});
