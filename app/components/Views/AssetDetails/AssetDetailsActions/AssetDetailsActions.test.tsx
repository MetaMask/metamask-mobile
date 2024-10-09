import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AssetDetailsActions from './AssetDetailsActions';
import { strings } from '../../../../../locales/i18n';
import {
  TOKEN_OVERVIEW_BRIDGE_BUTTON,
  TOKEN_OVERVIEW_BUY_BUTTON,
  TOKEN_OVERVIEW_RECEIVE_BUTTON,
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_OVERVIEW_SWAP_BUTTON,
} from '../../../../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';

describe('AssetDetailsActions', () => {
  const mockOnBuy = jest.fn();
  const mockGoToSwaps = jest.fn();
  const mockGoToBridge = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnReceive = jest.fn();

  const defaultProps = {
    displayBuyButton: true,
    displaySwapsButton: true,
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
    const { toJSON } = render(<AssetDetailsActions {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with all buttons displayed', () => {
    const { getByText } = render(<AssetDetailsActions {...defaultProps} />);

    expect(getByText(strings('asset_overview.buy_button'))).toBeTruthy();
    expect(getByText(strings('asset_overview.swap'))).toBeTruthy();
    expect(getByText(strings('asset_overview.bridge'))).toBeTruthy();
    expect(getByText(strings('asset_overview.send_button'))).toBeTruthy();
    expect(getByText(strings('asset_overview.receive_button'))).toBeTruthy();
  });

  it('calls onBuy when the buy button is pressed', () => {
    const { getByTestId } = render(<AssetDetailsActions {...defaultProps} />);

    fireEvent.press(getByTestId(TOKEN_OVERVIEW_BUY_BUTTON));
    expect(mockOnBuy).toHaveBeenCalled();
  });

  it('calls goToSwaps when the swap button is pressed', () => {
    const { getByTestId } = render(<AssetDetailsActions {...defaultProps} />);

    fireEvent.press(getByTestId(TOKEN_OVERVIEW_SWAP_BUTTON));
    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('calls goToBridge when the bridge button is pressed', () => {
    const { getByTestId } = render(<AssetDetailsActions {...defaultProps} />);

    fireEvent.press(getByTestId(TOKEN_OVERVIEW_BRIDGE_BUTTON));
    expect(mockGoToBridge).toHaveBeenCalled();
  });

  it('calls onSend when the send button is pressed', () => {
    const { getByTestId } = render(<AssetDetailsActions {...defaultProps} />);

    fireEvent.press(getByTestId(TOKEN_OVERVIEW_SEND_BUTTON));
    expect(mockOnSend).toHaveBeenCalled();
  });

  it('calls onReceive when the receive button is pressed', () => {
    const { getByTestId } = render(<AssetDetailsActions {...defaultProps} />);

    fireEvent.press(getByTestId(TOKEN_OVERVIEW_RECEIVE_BUTTON));
    expect(mockOnReceive).toHaveBeenCalled();
  });

  it('does not render the buy button when displayBuyButton is false', () => {
    const { queryByText } = render(
      <AssetDetailsActions {...defaultProps} displayBuyButton={false} />,
    );

    expect(queryByText(strings('asset_overview.buy_button'))).toBeNull();
  });

  it('does not render the swap button when displaySwapsButton is false', () => {
    const { queryByText } = render(
      <AssetDetailsActions {...defaultProps} displaySwapsButton={false} />,
    );

    expect(queryByText(strings('asset_overview.swap'))).toBeNull();
  });
});
