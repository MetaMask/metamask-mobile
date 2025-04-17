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

describe('AssetDetailsActions', () => {
  const mockOnBuy = jest.fn();
  const mockGoToSwaps = jest.fn();
  const mockGoToBridge = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnReceive = jest.fn();

  const defaultProps = {
    displayBuyButton: true,
    displaySwapsButton: true,
    displayBridgeButton: true,
    swapsIsLive: true,
    onBuy: mockOnBuy,
    goToSwaps: mockGoToSwaps,
    goToBridge: mockGoToBridge,
    onSend: mockOnSend,
    onReceive: mockOnReceive,
  };

  afterEach(() => {
    jest.clearAllMocks();
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
    expect(getByText(strings('asset_overview.bridge'))).toBeTruthy();
    expect(getByText(strings('asset_overview.send_button'))).toBeTruthy();
    expect(getByText(strings('asset_overview.receive_button'))).toBeTruthy();
  });

  it('calls onBuy when the buy button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON));
    expect(mockOnBuy).toHaveBeenCalled();
  });

  it('calls goToSwaps when the swap button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SWAP_BUTTON));
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('calls goToBridge when the bridge button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.BRIDGE_BUTTON));
    expect(mockGoToBridge).toHaveBeenCalled();
  });

  it('calls onSend when the send button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <AssetDetailsActions {...defaultProps} />,
      { state: initialRootState },
    );

    fireEvent.press(getByTestId(TokenOverviewSelectorsIDs.SEND_BUTTON));
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

  it('disables buttons when the account cannot sign transactions', () => {
    const mockState = { ...MOCK_ACCOUNTS_CONTROLLER_STATE };
    mockState.internalAccounts.accounts[expectedUuid2].methods = Object.values(
      EthMethod,
    ).filter((method) => method !== EthMethod.SignTransaction);

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
      TokenOverviewSelectorsIDs.BUY_BUTTON,
      TokenOverviewSelectorsIDs.SWAP_BUTTON,
      TokenOverviewSelectorsIDs.BRIDGE_BUTTON,
      TokenOverviewSelectorsIDs.SEND_BUTTON,
    ];

    buttons.forEach((buttonTestId) => {
      expect(getByTestId(buttonTestId).props.disabled).toBe(true);
    });

    // The receive button should always be enabled
    expect(
      getByTestId(TokenOverviewSelectorsIDs.RECEIVE_BUTTON).props.disabled,
    ).toBe(false);
  });
});
