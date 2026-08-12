import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ToastSeverity } from '@metamask/design-system-react-native';
import TokenDetailsList from './';

const mockSetString = jest.fn();
jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: (...args: unknown[]) => mockSetString(...args),
}));

const mockToast = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign((...args: unknown[]) => mockToast(...args), {
      dismiss: jest.fn(),
    }),
  };
});

const mockTokenDetails = {
  contractAddress: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  tokenDecimal: 18,
  tokenList: 'Metamask, Coinmarketcap',
};

const renderComponent = (props?: { onCopyAddress?: () => void }) =>
  render(<TokenDetailsList tokenDetails={mockTokenDetails} {...props} />);

describe('TokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('copies contract address and shows toast when contract address is tapped', async () => {
    mockSetString.mockResolvedValue(undefined);
    const mockOnCopyAddress = jest.fn();
    const { getByText } = renderComponent({
      onCopyAddress: mockOnCopyAddress,
    });

    fireEvent.press(getByText('0x935E7...05477'));

    await waitFor(() => {
      expect(mockOnCopyAddress).toHaveBeenCalledTimes(1);
    });
    expect(mockSetString).toHaveBeenCalledWith(
      mockTokenDetails.contractAddress,
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
  });
});
