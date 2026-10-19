import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsMarketLimitToggle from './PerpsMarketLimitToggle';

describe('PerpsMarketLimitToggle', () => {
  it.each([
    ['market', 'perps.order.market'],
    ['limit', 'perps.order.limit'],
  ] as const)('renders the %s order type', (orderType, labelKey) => {
    render(
      <PerpsMarketLimitToggle
        orderType={orderType}
        isDisabled={false}
        onPress={jest.fn()}
        testID="order-type-toggle"
      />,
    );

    const label = strings(labelKey);
    expect(screen.getByTestId('order-type-toggle')).toHaveTextContent(label);
    expect(screen.getByLabelText(`${label} order type`)).toBeOnTheScreen();
    expect(screen.getByTestId('perps-swap-icon')).toBeOnTheScreen();
  });

  it('forwards press and disabled state', () => {
    const onPress = jest.fn();
    const { rerender } = render(
      <PerpsMarketLimitToggle
        orderType="market"
        isDisabled={false}
        onPress={onPress}
        testID="order-type-toggle"
      />,
    );

    fireEvent.press(screen.getByTestId('order-type-toggle'));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(
      <PerpsMarketLimitToggle
        orderType="market"
        isDisabled
        onPress={onPress}
        testID="order-type-toggle"
      />,
    );
    expect(screen.getByTestId('order-type-toggle')).toBeDisabled();
  });
});
