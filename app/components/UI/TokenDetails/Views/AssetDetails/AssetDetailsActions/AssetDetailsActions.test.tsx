import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import AssetDetailsActions from './AssetDetailsActions';
import { strings } from '../../../../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../../components/AssetOverview/TokenOverview.testIds';
import {
  expectedUuid2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../../../util/test/accountsControllerTestUtils';
import { EthMethod } from '@metamask/keyring-api';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectIsSwapsEnabled } from '../../../../../../core/redux/slices/bridge';

// Mock the navigation hook
const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn()); // Returns unsubscribe function
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({
      navigate: mockNavigate,
      addListener: mockAddListener,
    })),
    useFocusEffect: jest.fn((callback) => {
      // Call the callback immediately to simulate focus
      callback();
    }),
  };
});

// Mock react-native-device-info to provide a valid version string
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.0.0'),
}));

// Mock the selectIsSwapsEnabled selector
jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../../core/redux/slices/bridge'),
  selectIsSwapsEnabled: jest.fn(),
}));

// Mock the ramp hooks
jest.mock('../../../../Ramp/Aggregator/hooks/useRampNetwork', () => () => [
  true,
]);

jest.mock('../../../../Ramp/Deposit/hooks/useDepositEnabled', () => ({
  __esModule: true,
  default: () => ({ isDepositEnabled: true }),
}));

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('AssetDetailsActions', () => {
  const mockOnBuy = jest.fn();
  const mockGoToSwaps = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnReceive = jest.fn();

  const defaultProps = {
    displayBuyButton: true,
    displaySwapsButton: true,
    chainId: '0x1' as const,
    goToSwaps: mockGoToSwaps,
    onSend: mockOnSend,
    onReceive: mockOnReceive,
  };

  // Helper function to create state with accounts that can sign transactions
  const createStateWithSigningCapability = () => ({
    ...initialRootState,
    engine: {
      ...initialRootState.engine,
      backgroundState: {
        ...initialRootState.engine.backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAddListener.mockClear();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    jest.mocked(selectIsSwapsEnabled).mockReset();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with all buttons displayed', () => {
    const { getByText } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    expect(getByText(strings('asset_overview.buy_button'))).toBeTruthy();
    expect(getByText(strings('asset_overview.swap'))).toBeTruthy();
    expect(getByText(strings('asset_overview.send_button'))).toBeTruthy();
    expect(getByText(strings('asset_overview.receive_button'))).toBeTruthy();
  });

  it('navigates to FundActionMenu with both onBuy and asset context when both are provided', () => {
    const mockAsset = { address: '0x123', chainId: '0x1' };
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions
        {...defaultProps}
        asset={mockAsset}
        onBuy={mockOnBuy}
      />,
      { state: createStateWithSigningCapability() },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
      params: {
        onBuy: mockOnBuy,
        asset: mockAsset,
      },
    });
  });

  it('navigates to FundActionMenu with neither onBuy nor asset context when no props provided', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: createStateWithSigningCapability() },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
      params: {
        onBuy: undefined,
        asset: undefined,
      },
    });
  });

  it('tracks action button click when buy button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: createStateWithSigningCapability() },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);

    const mockEventBuilder = mockCreateEventBuilder.mock.results[0].value;
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      action_name: 'buy',
      action_position: 0, // ActionPosition.BUY = 0
      button_label: strings('asset_overview.buy_button'),
      location: 'home',
    });
    expect(mockEventBuilder.build).toHaveBeenCalled();
  });

  it('calls goToSwaps when the swap button is pressed', () => {
    // Given swaps are enabled
    jest.mocked(selectIsSwapsEnabled).mockReturnValue(true);

    // Given a state with an account that can sign transactions
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: createStateWithSigningCapability() },
    );

    // When the button is pressed
    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SWAP_BUTTON));

    // Then the goToSwaps callback should be called
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('calls onSend when the send button is pressed', () => {
    // Given a state with an account that can sign transactions
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: createStateWithSigningCapability() },
    );

    // When the button is pressed
    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON));

    // Then the onSend callback should be called
    expect(mockOnSend).toHaveBeenCalled();
  });

  it('calls onReceive when the receive button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON));
    expect(mockOnReceive).toHaveBeenCalled();
  });

  it('does not render the buy button when displayBuyButton is false', () => {
    const { queryByText } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} displayBuyButton={false} />,
      { state: initialRootState },
    );

    expect(queryByText(strings('asset_overview.buy_button'))).toBeNull();
  });

  it('does not render the swap button when displaySwapsButton is false', () => {
    const { queryByText } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} displaySwapsButton={false} />,
      { state: initialRootState },
    );

    expect(queryByText(strings('asset_overview.swap'))).toBeNull();
  });

  it('renders correct number of buttons when unified UI is enabled', () => {
    const { queryByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    // Should have 4 buttons: Buy, Swap, Send, Receive (no Bridge)
    expect(queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON)).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.SWAP_BUTTON)).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON)).toBeTruthy();
    expect(
      queryByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
    ).toBeTruthy();
  });

  it('disables buttons when the account cannot sign transactions', () => {
    // Create a deep copy of the mock state to avoid mutating the original
    const mockState = {
      ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      internalAccounts: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
        accounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
          [expectedUuid2]: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
              expectedUuid2
            ],
            methods: Object.values(EthMethod).filter(
              (method) => method !== EthMethod.SignTransaction,
            ),
          },
        },
      },
    };

    const initialState = {
      ...initialRootState,
      engine: {
        ...initialRootState.engine,
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          AccountsController: mockState,
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      {
        state: initialState,
      },
    );

    const buttons = [
      TokenOverviewSelectorsIDs.SWAP_BUTTON,
      TokenOverviewSelectorsIDs.SEND_BUTTON,
    ];

    buttons.forEach((buttonTestId) => {
      const button = getByTestId(buttonTestId);
      expect(button).toBeDisabled();
    });

    // The receive button should always be enabled
    const receiveButton = getByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON);
    expect(receiveButton).not.toBeDisabled();
  });

  // Note: Test for fund button visibility when both deposit and ramp are unavailable
  // is covered by the fund button logic in AssetDetailsActions component lines 61-66.
  // When isFundMenuAvailable = isDepositEnabled || isNetworkRampSupported evaluates to false,
  // the fund button will not be displayed. This scenario is tested in the Asset component tests.
});
