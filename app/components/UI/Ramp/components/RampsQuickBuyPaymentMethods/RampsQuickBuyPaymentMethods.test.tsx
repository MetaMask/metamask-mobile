import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import RampsQuickBuyPaymentMethods from './RampsQuickBuyPaymentMethods';
import useRampsQuickBuy from '../../hooks/useRampsQuickBuy';

jest.mock('../../hooks/useRampsQuickBuy', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseRampsQuickBuy = useRampsQuickBuy as jest.MockedFunction<
  typeof useRampsQuickBuy
>;

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('RampsQuickBuyPaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseRampsQuickBuy.mockReturnValue({
      paymentOptions: [],
      isLoading: true,
      error: null,
      hasOptions: false,
    });

    const { getByTestId } = renderWithTheme(
      <RampsQuickBuyPaymentMethods assetId="eip155:1/slip44:60" amount="100" />,
    );

    expect(getByTestId('ramps-quick-buy-loading')).toBeOnTheScreen();
  });

  it('renders error state', () => {
    mockUseRampsQuickBuy.mockReturnValue({
      paymentOptions: [],
      isLoading: false,
      error: 'Something went wrong',
      hasOptions: false,
    });

    const { getByText } = renderWithTheme(
      <RampsQuickBuyPaymentMethods assetId="eip155:1/slip44:60" amount="100" />,
    );

    expect(getByText('Something went wrong')).toBeOnTheScreen();
  });

  it('renders payment options and handles press', () => {
    const onPress = jest.fn();
    const onOptionPress = jest.fn();
    mockUseRampsQuickBuy.mockReturnValue({
      paymentOptions: [
        {
          providerId: '/providers/transak',
          providerName: 'Transak',
          paymentMethodId: '/payments/debit-credit-card',
          paymentMethodName: 'Card',
          deeplink: 'metamask://buy?...',
          onPress,
        },
      ],
      isLoading: false,
      error: null,
      hasOptions: true,
    });

    const { getByTestId } = renderWithTheme(
      <RampsQuickBuyPaymentMethods
        assetId="eip155:1/slip44:60"
        amount="100"
        onOptionPress={onOptionPress}
      />,
    );

    fireEvent.press(getByTestId('ramps-quick-buy-option-0'));

    expect(onOptionPress).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: '/providers/transak',
        paymentMethodId: '/payments/debit-credit-card',
      }),
    );
    expect(onPress).toHaveBeenCalled();
  });
});
