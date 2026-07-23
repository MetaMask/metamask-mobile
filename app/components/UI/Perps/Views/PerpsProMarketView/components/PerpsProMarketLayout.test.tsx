import React from 'react';
import { View } from 'react-native';
import { render, within } from '@testing-library/react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProMarketLayout from './PerpsProMarketLayout';

const renderLayout = () =>
  render(
    <PerpsProMarketLayout
      orderForm={<View testID="mock-order-form" />}
      orderBook={<View testID="mock-order-book" />}
    />,
  );

describe('PerpsProMarketLayout', () => {
  it('places the order form left and the order book right', () => {
    const { getByTestId } = renderLayout();

    const leftColumn = getByTestId(PerpsProMarketViewSelectorsIDs.LEFT_COLUMN);
    const rightColumn = getByTestId(
      PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN,
    );

    expect(within(leftColumn).getByTestId('mock-order-form')).toBeOnTheScreen();
    expect(
      within(rightColumn).getByTestId('mock-order-book'),
    ).toBeOnTheScreen();
    expect(leftColumn).toHaveStyle({ flex: 1 });
    expect(rightColumn).toHaveStyle({ width: 132 });
  });

  it('uses the Figma trading-area dimensions', () => {
    const { getByTestId } = renderLayout();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toHaveStyle({
      minHeight: 682,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.VERTICAL_DIVIDER),
    ).toHaveStyle({ width: 24 });
  });
});
