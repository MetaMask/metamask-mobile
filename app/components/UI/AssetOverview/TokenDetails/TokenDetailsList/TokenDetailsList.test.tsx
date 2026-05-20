import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TokenDetailsList from './';
import { ToastContext } from '../../../../../component-library/components/Toast';

const mockSetString = jest.fn();
jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: (...args: unknown[]) => mockSetString(...args),
}));

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: mockCloseToast },
};

const mockTokenDetails = {
  contractAddress: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  tokenDecimal: 18,
  tokenList: 'Metamask, Coinmarketcap',
};

const renderComponent = (props?: { onCopyAddress?: () => void }) =>
  render(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <TokenDetailsList tokenDetails={mockTokenDetails} {...props} />
    </ToastContext.Provider>,
  );

describe('TokenDetails', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = renderComponent();

    expect(getByText('Token details')).toBeOnTheScreen();
    expect(getByText('Contract address')).toBeOnTheScreen();
    expect(getByText('0x935E7...05477')).toBeOnTheScreen();
    expect(getByText('Token decimal')).toBeOnTheScreen();
    expect(getByText('18')).toBeOnTheScreen();
    expect(getByText('Token list')).toBeOnTheScreen();
    expect(getByText('Metamask, Coinmarketcap')).toBeOnTheScreen();
  });

  it('calls onCopyAddress when contract address is tapped', async () => {
    mockSetString.mockResolvedValue(undefined);
    const mockOnCopyAddress = jest.fn();
    const { getByText } = renderComponent({
      onCopyAddress: mockOnCopyAddress,
    });

    fireEvent.press(getByText('0x935E7...05477'));
    await waitFor(() => {
      expect(mockOnCopyAddress).toHaveBeenCalledTimes(1);
    });
  });
});
