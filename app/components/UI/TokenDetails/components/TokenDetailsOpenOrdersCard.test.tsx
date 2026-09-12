import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsOpenOrdersCard } from './TokenDetailsOpenOrdersCard';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

describe('TokenDetailsOpenOrdersCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders open orders section header and rows for ETH token', () => {
    const { getByText, queryByText } = render(
      <TokenDetailsOpenOrdersCard tokenSymbol="ETH" />,
    );

    expect(getByText('Open Orders')).toBeTruthy();
    expect(getByText('ETH/USDC')).toBeTruthy();
    // Does not have place limit button
    expect(queryByText('+ Place Limit')).toBeNull();
  });

  it('renders nothing when no orders match the token', () => {
    const { queryByText } = render(
      <TokenDetailsOpenOrdersCard tokenSymbol="NONEXISTENT" />,
    );

    expect(queryByText('Open Orders')).toBeNull();
  });

  it('navigates to ORDER_DETAILS_VIEW full page when an order row is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsOpenOrdersCard tokenSymbol="ETH" />,
    );

    const firstOrderRow = getByTestId('order-row-swap-limit-1');
    fireEvent.press(firstOrderRow);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.ORDER_DETAILS_VIEW,
      expect.objectContaining({
        orderId: 'swap-limit-1',
        order: expect.objectContaining({ id: 'swap-limit-1' }),
      }),
    );
  });
});
