import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import type { PredictEntityId, PredictMarket } from '../../types';
import { MarketList } from './MarketList';
import { MarketListTestIds } from './MarketList.testIds';

const createMarket = (id: string, question: string): PredictMarket => ({
  id: id as PredictEntityId,
  question,
  status: 'active',
  outcomes: [
    { id: `${id}-yes` as PredictEntityId, side: 'yes', label: 'Yes' },
    { id: `${id}-no` as PredictEntityId, side: 'no', label: 'No' },
  ],
});

describe('MarketList', () => {
  it('renders mixed card variants in the supplied Market order', () => {
    const markets = [
      createMarket('standard', 'Standard'),
      createMarket('future', 'Future variant'),
    ];

    render(
      <MarketList
        markets={markets}
        renderItem={(market) => (
          <Text
            testID={market.id === 'standard' ? 'standard-card' : 'future-card'}
          >
            {market.question}
          </Text>
        )}
      />,
    );

    const list = within(screen.getByTestId(MarketListTestIds.ROOT));
    const children = list.getAllByText(/Standard|Future variant/);

    expect(children[0]).toHaveTextContent('Standard');
    expect(children[1]).toHaveTextContent('Future variant');
  });

  it('uses a caller-supplied test ID', () => {
    render(
      <MarketList
        testID="custom-market-list"
        markets={[createMarket('market-1', 'Market')]}
        renderItem={(market) => <Text>{market.question}</Text>}
      />,
    );

    expect(screen.getByTestId('custom-market-list')).toBeOnTheScreen();
  });

  it('renders the list header above Market rows', () => {
    render(
      <MarketList
        markets={[createMarket('market-1', 'Market')]}
        ListHeaderComponent={<Text testID="list-header">Predict</Text>}
        renderItem={(market) => <Text>{market.question}</Text>}
      />,
    );

    const list = within(screen.getByTestId(MarketListTestIds.ROOT));
    const items = list.getAllByText(/Predict|Market/);

    expect(items[0]).toHaveTextContent('Predict');
    expect(items[1]).toHaveTextContent('Market');
  });
});
