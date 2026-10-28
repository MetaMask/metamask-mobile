import React from 'react';
import { render, within } from '@testing-library/react-native';
import TabsBar from '../../../../../../../component-library/components-temp/Tabs/TabsBar';
import { createPositionsTab } from './createPositionsTab';

// Narrow presentation seam: availability and query journeys live in the view tests.
describe('createPositionsTab', () => {
  it.each([
    { count: undefined, badge: undefined, label: 'Positions' },
    { count: 0, badge: '0', label: 'Positions, 0' },
    { count: 1, badge: '1', label: 'Positions, 1' },
    { count: 99, badge: '99', label: 'Positions, 99' },
    { count: 100, badge: '99+', label: 'Positions, 99+' },
  ])(
    'represents count $count once for accessibility',
    ({ count, badge, label }) => {
      const view = render(
        <TabsBar
          tabs={[createPositionsTab(count)]}
          activeIndex={0}
          onTabPress={jest.fn()}
        />,
      );
      const tab = within(
        view.getByRole('tab', { name: label, selected: true }),
      );

      expect(tab.getAllByText('Positions')).toHaveLength(1);
      expect(tab.queryByText(/^(0|1|99|99\+)$/)).not.toBeOnTheScreen();
      if (badge === undefined) {
        expect(
          tab.queryByText(/^(0|1|99|99\+)$/, { includeHiddenElements: true }),
        ).not.toBeOnTheScreen();
      } else {
        expect(
          tab.getByText(badge, { includeHiddenElements: true }),
        ).toBeOnTheScreen();
      }
    },
  );
});
