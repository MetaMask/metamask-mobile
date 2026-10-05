import { IconName } from '@metamask/design-system-react-native';
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
  const PRICE_TEST_ID = 'price';
  const DISTANCE_TEST_ID = 'distance';
  const ICON_TEST_ID = 'icon';

  it('renders a two-decimal distance and downward trend for a long', () => {
    // Arrange
    const props = {
      liquidationPrice: '1800',
      currentPrice: 2000,
      isLong: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue
        {...props}
        priceTestID={PRICE_TEST_ID}
        distanceTestID={DISTANCE_TEST_ID}
        iconTestID={ICON_TEST_ID}
      />,
    );

    // Assert
    expect(rendered.getByTestId(PRICE_TEST_ID)).toHaveTextContent('$1,800');
    expect(rendered.getByTestId(DISTANCE_TEST_ID)).toHaveTextContent('10.00%');
    expect(rendered.getByTestId(ICON_TEST_ID).props.name).toBe(
      IconName.TrendDown,
    );
  });

  it('renders an upward trend for a short', () => {
    // Arrange
    const props = {
      liquidationPrice: '2200',
      currentPrice: 2000,
      isLong: false,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue {...props} iconTestID={ICON_TEST_ID} />,
    );

    // Assert
    expect(rendered.getByTestId(ICON_TEST_ID).props.name).toBe(
      IconName.TrendUp,
    );
  });

  it('hides the distance and trend when privacy mode is enabled', () => {
    // Arrange
    const props = {
      liquidationPrice: '1800',
      currentPrice: 2000,
      isLong: true,
      privacyMode: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue
        {...props}
        distanceTestID={DISTANCE_TEST_ID}
        iconTestID={ICON_TEST_ID}
      />,
    );

    // Assert
    expect(rendered.queryByTestId(DISTANCE_TEST_ID)).toBeNull();
    expect(rendered.queryByTestId(ICON_TEST_ID)).toBeNull();
  });

  it('uses the cross-position fallback when liquidation price is missing', () => {
    // Arrange
    const props = {
      liquidationPrice: null,
      isLong: true,
      isCross: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue {...props} priceTestID={PRICE_TEST_ID} />,
    );

    // Assert
    expect(rendered.getByTestId(PRICE_TEST_ID)).toHaveTextContent(
      'No liquidation price',
    );
  });

  it('uses the standard fallback when liquidation price is missing', () => {
    // Arrange
    const props = {
      liquidationPrice: null,
      isLong: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue {...props} priceTestID={PRICE_TEST_ID} />,
    );

    // Assert
    expect(rendered.getByTestId(PRICE_TEST_ID)).toHaveTextContent('$---');
  });

  it('keeps a sub-one-percent distance visible', () => {
    // Arrange
    const props = {
      liquidationPrice: '1992',
      currentPrice: 2000,
      isLong: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue
        {...props}
        distanceTestID={DISTANCE_TEST_ID}
      />,
    );

    // Assert
    expect(rendered.getByTestId(DISTANCE_TEST_ID)).toHaveTextContent('0.40%');
  });

  it.each([
    ['an omitted current price', undefined],
    ['a non-numeric current price', Number.NaN],
    ['a zero current price', 0],
  ])('omits distance and trend for %s', (_description, currentPrice) => {
    // Arrange
    const props = {
      liquidationPrice: '1800',
      currentPrice,
      isLong: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue
        {...props}
        distanceTestID={DISTANCE_TEST_ID}
        iconTestID={ICON_TEST_ID}
      />,
    );

    // Assert
    expect(rendered.queryByTestId(DISTANCE_TEST_ID)).toBeNull();
    expect(rendered.queryByTestId(ICON_TEST_ID)).toBeNull();
  });

  it.each([
    ['a non-numeric liquidation price', 'abc'],
    ['a zero liquidation price', 0],
  ])('omits distance and trend for %s', (_description, liquidationPrice) => {
    // Arrange
    const props = {
      liquidationPrice,
      currentPrice: 2000,
      isLong: true,
    };

    // Act
    const rendered = render(
      <PerpsLiquidationPriceValue
        {...props}
        distanceTestID={DISTANCE_TEST_ID}
        iconTestID={ICON_TEST_ID}
      />,
    );

    // Assert
    expect(rendered.queryByTestId(DISTANCE_TEST_ID)).toBeNull();
    expect(rendered.queryByTestId(ICON_TEST_ID)).toBeNull();
  });
});
