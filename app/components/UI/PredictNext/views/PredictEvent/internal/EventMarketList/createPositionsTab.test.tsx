import React from 'react';
import { render, within } from '@testing-library/react-native';
import TabsBar from '../../../../../../../component-library/components-temp/Tabs/TabsBar';
import { EventMarketListTestIds } from './EventMarketList.testIds';
import { createPositionsTab } from './createPositionsTab';

// Narrow presentation seam: availability and query journeys live in the view tests.
describe('createPositionsTab', () => {
  it.each([
    { count: undefined, badge: undefined },
    { count: 0, badge: '0' },
    { count: 1, badge: '1' },
    { count: 99, badge: '99' },
    { count: 100, badge: '99+' },
  ])(
    'renders the optional count $count using the shared TabsBar',
    ({ count, badge }) => {
      const view = render(
        <TabsBar
          tabs={[createPositionsTab(count)]}
          activeIndex={0}
          onTabPress={jest.fn()}
        />,
      );
      const tab = within(
        view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
      );

      if (badge === undefined) {
        expect(tab.queryByText(/^(0|1|99|99\+)$/)).not.toBeOnTheScreen();
      } else {
        expect(tab.getByText(badge)).toBeOnTheScreen();
      }
    },
  );
});
