import React from 'react';
import { BadgeCount } from '@metamask/design-system-react-native';
import type { TabItem } from '../../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { strings } from '../../../../../../../../locales/i18n';
import { EventMarketListTestIds } from './EventMarketList.testIds';

const MAX_BADGE_COUNT = 99;

/** Keeps the displayed count and its single tab announcement in agreement. */
export const createPositionsTab = (
  count?: number,
): TabItem & { key: 'positions' } => ({
  key: 'positions',
  label: strings('predict_next.portfolio.positions'),
  content: null,
  testID: EventMarketListTestIds.POSITIONS_TAB,
  accessibilityLabel:
    count === undefined
      ? strings('predict_next.portfolio.positions')
      : strings('predict_next.event.positions_with_count', {
          count: count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : `${count}`,
        }),
  // Keep the badge at the label's raised trailing edge, without the default gap.
  endAccessory:
    count === undefined ? undefined : (
      <BadgeCount
        count={count}
        max={MAX_BADGE_COUNT}
        twClassName="relative -top-px -ml-2 h-auto min-h-3 min-w-3 rounded bg-error-default-hover px-0.5"
        textProps={{ twClassName: 'text-[10px] leading-[12px]' }}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    ),
});
