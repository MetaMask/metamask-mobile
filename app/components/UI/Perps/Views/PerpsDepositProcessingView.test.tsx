import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import PerpsDepositProcessingView from './PerpsDepositProcessingView';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { ARBITRUM_MAINNET_CHAIN_ID } from '../constants/hyperLiquidConfig';
import type { DepositStatus } from '../controllers/types';
import { PerpsDepositProcessingViewSelectorsIDs } from '../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.50.1'),
}));

// Mock navigation
interface MockRouteParams {
  amount: string;
  selectedToken: string;
  isDirectDeposit: boolean;
}

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    amount: '100',
    selectedToken: 'USDC',
    isDirectDeposit: true,
  } as MockRouteParams | undefined,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
  useRoute: jest.fn(() => mockRoute),
}));

// Mock hooks
let mockUsePerpsDeposit = {
  status: 'depositing' as DepositStatus,
  error: null as string | null,
  currentTxHash: null as string | null,
};

jest.mock('../hooks', () => ({
  usePerpsDeposit: jest.fn(),
}));

// Import the mocked module to set implementation
import { usePerpsDeposit } from '../hooks';
const mockedUsePerpsDeposit = usePerpsDeposit as jest.MockedFunction<
  typeof usePerpsDeposit
>;

const mockStore = configureMockStore();

describe('PerpsDepositProcessingView', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUsePerpsDeposit = {
      status: 'depositing' as DepositStatus,
      error: null as string | null,
      currentTxHash: null as string | null,
    };
    mockRoute.params = {
      amount: '100',
      selectedToken: 'USDC',
      isDirectDeposit: true,
    };
    mockNavigate.mockClear();
    mockGoBack.mockClear();

    // Set the mock implementation
    mockedUsePerpsDeposit.mockImplementation(() => mockUsePerpsDeposit);
  });
  const mockInitialState = {
    ...backgroundState,
    engine: {
      backgroundState: {
        ...backgroundState,
        NetworkController: {
          ...backgroundState.NetworkController,
          selectedNetworkClientId: 'arbitrum-mainnet',
          networkConfigurationsByChainId: {
            [ARBITRUM_MAINNET_CHAIN_ID]: {
              chainId: ARBITRUM_MAINNET_CHAIN_ID,
              name: 'Arbitrum One',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'arbitrum-mainnet',
                  url: 'https://arb1.arbitrum.io/rpc',
                  type: 'Custom',
                },
              ],
            },
          },
        },
        TokenListController: {
          tokenList: {},
        },
        PreferencesController: {
          ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component successfully', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.STATUS_TITLE),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.STATUS_DESCRIPTION),
      ).toBeTruthy();
    });
  });

  describe('deposit status display', () => {
    it('should show preparing status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'preparing',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(
          PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION,
        ),
      ).toBeTruthy();
      expect(getByText('Preparing deposit...')).toBeTruthy();
    });

    it('should show swapping status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'swapping',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(
          PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION,
        ),
      ).toBeTruthy();
      expect(getByText('Swapping USDC to USDC')).toBeTruthy();
    });

    it('should show bridging status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'bridging',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(
          PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION,
        ),
      ).toBeTruthy();
      expect(getByText('Bridging to Hyperliquid')).toBeTruthy();
    });

    it('should show depositing status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'depositing',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(
          PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ANIMATION,
        ),
      ).toBeTruthy();
      expect(getByText('Depositing into perps account')).toBeTruthy();
    });

    it('should show success status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'success',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.SUCCESS_CHECKMARK),
      ).toBeTruthy();
      expect(getByText('Deposit completed successfully!')).toBeTruthy();
      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.VIEW_BALANCE_BUTTON),
      ).toBeTruthy();
    });

    it('should show error status', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'error',
        error: 'Network error occurred' as string | null,
      };

      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.PROCESSING_ICON),
      ).toBeTruthy();
      expect(getByText('Deposit Failed')).toBeTruthy();
      expect(getByText('Network error occurred')).toBeTruthy();
      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.RETRY_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsDepositProcessingViewSelectorsIDs.GO_BACK_BUTTON),
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to success screen after success', async () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'success',
        currentTxHash: '0x123456' as string | null,
      };

      const store = mockStore(mockInitialState);
      render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.PERPS.DEPOSIT_SUCCESS,
            {
              amount: '100',
              selectedToken: 'USDC',
              txHash: '0x123456',
            },
          );
        },
        { timeout: 3000 },
      );
    });

    it('should handle close button press', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      const closeButton = getByTestId(
        PerpsDepositProcessingViewSelectorsIDs.CLOSE_BUTTON,
      );
      closeButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TRADING_VIEW);
    });

    it('should handle retry button press', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'error',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      const retryButton = getByTestId(
        PerpsDepositProcessingViewSelectorsIDs.RETRY_BUTTON,
      );
      retryButton.props.onPress();

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should handle view balance button press', () => {
      mockUsePerpsDeposit = {
        ...mockUsePerpsDeposit,
        status: 'success',
      };

      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      const viewBalanceButton = getByTestId(
        PerpsDepositProcessingViewSelectorsIDs.VIEW_BALANCE_BUTTON,
      );
      viewBalanceButton.props.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });
  });

  describe('token display', () => {
    it('should display token information', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      // Check that the token display wrapper is present
      expect(getByTestId('badge-wrapper-badge')).toBeTruthy();

      // Check that the amount and token symbol are displayed (with potential whitespace)
      expect(getByText(/100\s+USDC/)).toBeTruthy();
    });

    it('should handle missing route params', () => {
      // Update the mock route params
      mockRoute.params = undefined;

      const store = mockStore(mockInitialState);
      const { queryByTestId } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      // Should still render without crashing
      expect(
        queryByTestId(PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE),
      ).toBeTruthy();
    });
  });

  describe('direct deposit vs complex routes', () => {
    it('should show direct deposit message when isDirectDeposit is true', () => {
      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByText('Transferring USDC directly to your HyperLiquid account...'),
      ).toBeTruthy();
    });

    it('should show complex route message when isDirectDeposit is false', () => {
      // Update the mock route params
      mockRoute.params = {
        amount: '100',
        selectedToken: 'ETH',
        isDirectDeposit: false,
      };

      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositProcessingView />
        </Provider>,
      );

      expect(
        getByText('Transferring USDC to your HyperLiquid account...'),
      ).toBeTruthy();
    });
  });
});
