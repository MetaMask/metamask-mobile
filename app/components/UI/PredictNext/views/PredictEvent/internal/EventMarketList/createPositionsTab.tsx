import React from 'react';
import { BadgeCount } from '@metamask/design-system-react-native';
import type { TabItem } from '../../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { strings } from '../../../../../../../../locales/i18n';
import { EventMarketListTestIds } from './EventMarketList.testIds';

const MAX_BADGE_COUNT = 99;

/** Builds a shared TabsBar item with an optional available-holdings badge. */
export const createPositionsTab = (
  count?: number,
): TabItem & { key: 'positions' } => ({
  key: 'positions',
  label: strings('predict_next.portfolio.positions'),
  content: null,
  testID: EventMarketListTestIds.POSITIONS_TAB,
  // Keep the badge at the label's raised trailing edge, without the default gap.
  endAccessory:
    count === undefined ? undefined : (
      <BadgeCount
        count={count}
        max={MAX_BADGE_COUNT}
        twClassName="relative -top-px -ml-2 h-auto min-h-3 min-w-3 rounded bg-error-default-hover px-0.5"
        textProps={{ twClassName: 'text-[10px] leading-[12px]' }}
      />
    ),
});
