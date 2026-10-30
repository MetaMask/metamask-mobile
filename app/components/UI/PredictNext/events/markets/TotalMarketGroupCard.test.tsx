import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
} from '../../types';
import { MarketGroupCardTestIds as TestIds } from './MarketGroupCard.testIds';
import { TotalMarketGroupCard } from './TotalMarketGroupCard';

const GROUP = 'KXNFLTOTAL-26OCT29CARGB:total';

const market: PredictMarket = {
  id: 'TOTAL228' as PredictEntityId,
  question: 'Over 228.5 points?',
  status: 'active',
  group: {
    key: GROUP,
    groupType: 'marketSelector',
    marketType: 'total',
    option: { type: 'number', value: 228.5 },
  },
  outcomes: [
    {
      id: 'TOTAL228:yes' as PredictEntityId,
      side: 'yes',
      label: 'Over',
      askPrice: '0.48' as PredictDecimal,
    },
    {
      id: 'TOTAL228:no' as PredictEntityId,
      side: 'no',
      label: 'Under',
      askPrice: '0.52' as PredictDecimal,
    },
  ],
};

describe('TotalMarketGroupCard', () => {
  beforeEach(() => {
    render(
      <TotalMarketGroupCard
        groupKey={GROUP}
        markets={[market]}
        selectedMarket={market}
        onSelectMarket={jest.fn()}
        onRulesPress={jest.fn()}
      />,
    );
  });

  it('shows Over and Under with the prefixed line', () => {
    expect(
      screen.getByTestId(TestIds.row(GROUP, market.id, 'yes')),
    ).toHaveTextContent(/Over.*O 228\.5.*48¢/);
    expect(
      screen.getByTestId(TestIds.row(GROUP, market.id, 'no')),
    ).toHaveTextContent(/Under.*U 228\.5.*52¢/);
  });

  it('colors Over with success and Under with error', () => {
    expect(
      screen.getByTestId(TestIds.quoteBar(GROUP, market.id, 'yes')),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.success.default });
    expect(screen.getByText('48¢')).toHaveStyle({
      color: lightTheme.colors.success.default,
    });
    expect(
      screen.getByTestId(TestIds.quoteBar(GROUP, market.id, 'no')),
    ).toHaveStyle({ backgroundColor: lightTheme.colors.error.default });
    expect(screen.getByText('52¢')).toHaveStyle({
      color: lightTheme.colors.error.default,
    });
  });
});
