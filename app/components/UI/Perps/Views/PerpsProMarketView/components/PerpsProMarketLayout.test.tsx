import React from 'react';
import { View } from 'react-native';
import { render, within } from '@testing-library/react-native';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import type { PerpsProLayoutConfig } from '../PerpsProMarketView.types';
import PerpsProMarketLayout from './PerpsProMarketLayout';

const renderLayout = (config: PerpsProLayoutConfig) =>
  render(
    <PerpsProMarketLayout
      config={config}
      orderForm={<View testID="mock-order-form" />}
      orderBook={<View testID="mock-order-book" />}
    />,
  );

describe('PerpsProMarketLayout', () => {
  it.each([
    {
      name: 'default opposing positions',
      config: {
        orderFormPosition: 'left',
        orderBookPosition: 'right',
      },
      expectedLeftPanel: 'mock-order-form',
      expectedRightPanel: 'mock-order-book',
    },
    {
      name: 'reversed opposing positions',
      config: {
        orderFormPosition: 'right',
        orderBookPosition: 'left',
      },
      expectedLeftPanel: 'mock-order-book',
      expectedRightPanel: 'mock-order-form',
    },
    {
      name: 'conflicting left positions',
      config: {
        orderFormPosition: 'left',
        orderBookPosition: 'left',
      },
      expectedLeftPanel: 'mock-order-form',
      expectedRightPanel: 'mock-order-book',
    },
    {
      name: 'conflicting right positions',
      config: {
        orderFormPosition: 'right',
        orderBookPosition: 'right',
      },
      expectedLeftPanel: 'mock-order-form',
      expectedRightPanel: 'mock-order-book',
    },
  ] as const)(
    'places panels for $name',
    ({ config, expectedLeftPanel, expectedRightPanel }) => {
      const { getByTestId } = renderLayout(config);

      const leftColumn = getByTestId(
        PerpsProMarketViewSelectorsIDs.LEFT_COLUMN,
      );
      const rightColumn = getByTestId(
        PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN,
      );

      expect(
        within(leftColumn).getByTestId(expectedLeftPanel),
      ).toBeOnTheScreen();
      expect(
        within(rightColumn).getByTestId(expectedRightPanel),
      ).toBeOnTheScreen();
    },
  );

  it('uses the Figma trading-area dimensions', () => {
    const { getByTestId } = renderLayout({
      orderFormPosition: 'left',
      orderBookPosition: 'right',
    });

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT)).toHaveStyle({
      minHeight: 682,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.VERTICAL_DIVIDER),
    ).toHaveStyle({ width: 24 });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).toHaveStyle({ width: 132 });
  });
});
