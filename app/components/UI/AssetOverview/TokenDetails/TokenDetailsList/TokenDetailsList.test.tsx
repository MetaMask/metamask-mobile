import React from 'react';
import { render } from '@testing-library/react-native';
import TokenDetailsList from './';
import { ToastContext } from '../../../../../component-library/components/Toast';

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

const renderComponent = () =>
  render(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <TokenDetailsList tokenDetails={mockTokenDetails} />
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
});
