import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import React, { useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProOrdersEmptyState from './PerpsProOrdersEmptyState';
import PerpsProPositionsEmptyState from './PerpsProPositionsEmptyState';

const POSITIONS_TAB_INDEX = 0;
const ORDERS_TAB_INDEX = 1;

/**
 * Pro-mode positions/orders section.
 *
 * Renders the two-tab bar (Positions / Orders) matching the Figma design.
 * Each tab currently shows its empty state — no ticket scopes populated
 * content yet.
 */
const PerpsProPositionsPanel = () => {
  const [activeIndex, setActiveIndex] = useState(POSITIONS_TAB_INDEX);

  const tabs: TabItem[] = [
    {
      key: 'positions',
      label: strings('perps.pro_positions_panel.positions'),
      content: null,
      testID: PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_POSITIONS,
    },
    {
      key: 'orders',
      label: strings('perps.pro_positions_panel.orders'),
      content: null,
      testID: PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
    },
  ];

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL}
      twClassName="py-3"
    >
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={setActiveIndex}
        testID={PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TABS}
      />
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="px-4 pt-6"
      >
        {activeIndex === ORDERS_TAB_INDEX ? (
          <PerpsProOrdersEmptyState />
        ) : (
          <PerpsProPositionsEmptyState />
        )}
      </Box>
    </Box>
  );
};

export default PerpsProPositionsPanel;
