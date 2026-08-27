import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import { MarketList } from './MarketList';
import { MarketListTestIds } from './MarketList.testIds';

describe('MarketList', () => {
  it('composes mixed card children in the supplied order', () => {
    render(
      <MarketList>
        <Text testID="standard-card">Standard</Text>
        <Text testID="future-card">Future variant</Text>
      </MarketList>,
    );

    const list = within(screen.getByTestId(MarketListTestIds.ROOT));
    const children = list.getAllByText(/Standard|Future variant/);

    expect(children[0]).toHaveTextContent('Standard');
    expect(children[1]).toHaveTextContent('Future variant');
  });

  it('uses a caller-supplied test ID', () => {
    render(
      <MarketList testID="custom-market-list">
        <Text>Market</Text>
      </MarketList>,
    );

    expect(screen.getByTestId('custom-market-list')).toBeOnTheScreen();
  });
});
