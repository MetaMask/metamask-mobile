import { Icon, IconName } from '@metamask/design-system-react-native';
import { render } from '@testing-library/react-native';
import React from 'react';
import PerpsLiquidationPriceValue from './PerpsLiquidationPriceValue';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    key === 'perps.cross_position.no_liquidation_price'
      ? 'No liquidation price'
      : key,
}));

describe('PerpsLiquidationPriceValue', () => {
  it('renders a two-decimal distance and downward trend for a long', () => {
    const rendered = render(
      <PerpsLiquidationPriceValue
        liquidationPrice="1800"
        currentPrice={2000}
        isLong
        priceTestID="price"
        distanceTestID="distance"
      />,
    );

    expect(rendered.getByTestId('price')).toHaveTextContent('$1,800');
    expect(rendered.getByTestId('distance')).toHaveTextContent('10.00%');
    expect(rendered.UNSAFE_getByType(Icon).props.name).toBe(IconName.TrendDown);
  });

  it('renders an upward trend for a short', () => {
    const rendered = render(
      <PerpsLiquidationPriceValue
        liquidationPrice="2200"
        currentPrice={2000}
        isLong={false}
      />,
    );

    expect(rendered.UNSAFE_getByType(Icon).props.name).toBe(IconName.TrendUp);
  });

  it('hides the distance and trend when privacy mode is enabled', () => {
    const rendered = render(
      <PerpsLiquidationPriceValue
        liquidationPrice="1800"
        currentPrice={2000}
        isLong
        privacyMode
        distanceTestID="distance"
      />,
    );

    expect(rendered.queryByTestId('distance')).toBeNull();
    expect(rendered.UNSAFE_queryAllByType(Icon)).toHaveLength(0);
  });

  it('uses the cross-position fallback when liquidation price is missing', () => {
    const rendered = render(
      <PerpsLiquidationPriceValue
        liquidationPrice={null}
        isLong
        isCross
        priceTestID="price"
      />,
    );

    expect(rendered.getByTestId('price')).toHaveTextContent(
      'No liquidation price',
    );
  });

  it('uses the standard fallback when liquidation price is missing', () => {
    const rendered = render(
      <PerpsLiquidationPriceValue
        liquidationPrice={null}
        isLong
        priceTestID="price"
      />,
    );

    expect(rendered.getByTestId('price')).toHaveTextContent('$---');
  });
});
