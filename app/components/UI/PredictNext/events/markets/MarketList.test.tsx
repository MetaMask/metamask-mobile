import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import { MarketList } from './MarketList';
import { MarketListTestIds } from './MarketList.testIds';

describe('MarketList', () => {
  it('renders mixed card variants in the supplied item order', () => {
    const items = [
      { id: 'standard', label: 'Standard' },
      { id: 'future', label: 'Future variant' },
    ];

    render(
      <MarketList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <Text
            testID={item.id === 'standard' ? 'standard-card' : 'future-card'}
          >
            {item.label}
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
        data={[{ id: 'market-1', label: 'Market' }]}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <Text>{item.label}</Text>}
      />,
    );

    expect(screen.getByTestId('custom-market-list')).toBeOnTheScreen();
  });

  it('renders the list header above Market rows', () => {
    render(
      <MarketList
        data={[{ id: 'market-1', label: 'Market' }]}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text testID="list-header">Predict</Text>}
        renderItem={(item) => <Text>{item.label}</Text>}
      />,
    );

    const list = within(screen.getByTestId(MarketListTestIds.ROOT));
    const items = list.getAllByText(/Predict|Market/);

    expect(items[0]).toHaveTextContent('Predict');
    expect(items[1]).toHaveTextContent('Market');
  });
});
