import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import AssetDetailsActions from './AssetDetailsActions';
import { strings } from '../../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../../../../e2e/selectors/wallet/TokenOverview.selectors';
import {
  expectedUuid2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../util/test/accountsControllerTestUtils';
import { EthMethod } from '@metamask/keyring-api';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import initialRootState from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';

// Mock the navigation hook
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
  };
});

// Mock the ramp hooks
jest.mock('../../../UI/Ramp/Aggregator/hooks/useRampNetwork', () => () => [
  true,
]);

jest.mock('../../../UI/Ramp/Deposit/hooks/useDepositEnabled', () => ({
  __esModule: true,
  default: () => ({ isDepositEnabled: true }),
}));

describe('AssetDetailsActions', () => {
  const mockOnBuy = jest.fn();
  const mockGoToSwaps = jest.fn();
  const mockGoToBridge = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnReceive = jest.fn();

  const defaultProps = {
    displayFundButton: true,
    displaySwapsButton: true,
    displayBridgeButton: true,
    swapsIsLive: true,
    goToSwaps: mockGoToSwaps,
    goToBridge: mockGoToBridge,
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

    expect(getByText(strings('asset_overview.fund_button'))).toBeTruthy();
    expect(getByText(strings('asset_overview.swap'))).toBeTruthy();
    expect(getByText(strings('asset_overview.bridge'))).toBeTruthy();
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

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.FUND_BUTTON));
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

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.FUND_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
      params: {
        onBuy: undefined,
        asset: undefined,
      },
    });
  });

  it('calls goToSwaps when the swap button is pressed', () => {
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

  it('calls goToBridge when the bridge button is pressed', () => {
    // Given a state with an account that can sign transactions
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: createStateWithSigningCapability() },
    );

    // When the button is pressed
    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.BRIDGE_BUTTON));

    // Then the goToBridge callback should be called
    expect(mockGoToBridge).toHaveBeenCalled();
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

  it('does not render the buy button when displayFundButton is false', () => {
    const { queryByText } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} displayFundButton={false} />,
      { state: initialRootState },
    );

    expect(queryByText(strings('asset_overview.fund_button'))).toBeNull();
  });

  it('does not render the swap button when displaySwapsButton is false', () => {
    const { queryByText } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} displaySwapsButton={false} />,
      { state: initialRootState },
    );

    expect(queryByText(strings('asset_overview.swap'))).toBeNull();
  });

  it('does not render the bridge button when displayBridgeButton is false (unified UI enabled)', () => {
    const { queryByText, queryByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} displayBridgeButton={false} />,
      { state: initialRootState },
    );

    expect(queryByText(strings('asset_overview.bridge'))).toBeNull();
    expect(queryByTestId(TokenOverviewSelectorsIDs.BRIDGE_BUTTON)).toBeNull();
  });

  it('renders the bridge button when displayBridgeButton is true (unified UI disabled)', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} displayBridgeButton />,
      { state: initialRootState },
    );

    expect(getByText(strings('asset_overview.bridge'))).toBeTruthy();
    expect(getByTestId(TokenOverviewSelectorsIDs.BRIDGE_BUTTON)).toBeTruthy();
  });

  it('renders correct number of buttons when unified UI is enabled', () => {
    const { queryByTestId } = renderWithProvider(
      <AssetDetailsActions
        {...defaultProps}
        displayBridgeButton={false} // Unified UI enabled
      />,
      { state: initialRootState },
    );

    // Should have 4 buttons: Buy, Swap, Send, Receive (no Bridge)
    expect(queryByTestId(TokenOverviewSelectorsIDs.FUND_BUTTON)).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.SWAP_BUTTON)).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON)).toBeTruthy();
    expect(
      queryByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
    ).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.BRIDGE_BUTTON)).toBeNull();
  });

  it('renders correct number of buttons when unified UI is disabled', () => {
    const { queryByTestId } = renderWithProvider(
      <AssetDetailsActions
        {...defaultProps}
        displayBridgeButton // Unified UI disabled
      />,
      { state: initialRootState },
    );

    // Should have 5 buttons: Buy, Swap, Bridge, Send, Receive
    expect(queryByTestId(TokenOverviewSelectorsIDs.FUND_BUTTON)).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.SWAP_BUTTON)).toBeTruthy();
    expect(queryByTestId(TokenOverviewSelectorsIDs.BRIDGE_BUTTON)).toBeTruthy();
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
      TokenOverviewSelectorsIDs.FUND_BUTTON,
      TokenOverviewSelectorsIDs.SWAP_BUTTON,
      TokenOverviewSelectorsIDs.BRIDGE_BUTTON,
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
