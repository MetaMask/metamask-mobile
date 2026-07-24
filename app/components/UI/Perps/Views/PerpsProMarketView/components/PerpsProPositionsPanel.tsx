import { Box } from '@metamask/design-system-react-native';
import React, { useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import {
  usePerpsLiveAccount,
  usePerpsLivePositions,
} from '../../../hooks/stream';
import {
  getPerpsProPositionRowSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import PerpsProOrdersEmptyState from './PerpsProOrdersEmptyState';
import PerpsProPositionCard from './PerpsProPositionCard';
import PerpsProPositionsEmptyState from './PerpsProPositionsEmptyState';
import PerpsProUnrealizedPnl from './PerpsProUnrealizedPnl';

const POSITIONS_TAB_INDEX = 0;
const ORDERS_TAB_INDEX = 1;

/**
 * Pro-mode positions/orders section.
 *
 * Renders the two-tab bar (Positions / Orders) matching the Figma design.
 * The Positions tab shows a read-only list of the user's open positions
 * across all assets, falling back to an empty state when there are none.
 * The Orders tab currently shows its empty state — no ticket scopes its
 * populated content yet.
 */
const PerpsProPositionsPanel = () => {
  const [activeIndex, setActiveIndex] = useState(POSITIONS_TAB_INDEX);
  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000,
    useLivePnl: true,
  });
  const { account } = usePerpsLiveAccount({ throttleMs: 1000 });

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

  const hasPositions = positions.length > 0;

  const renderPositionsTab = () => {
    if (hasPositions) {
      return (
        <Box testID={PerpsProMarketViewSelectorsIDs.POSITIONS_LIST}>
          <PerpsProUnrealizedPnl
            unrealizedPnl={account?.unrealizedPnl ?? '0'}
            returnOnEquity={account?.returnOnEquity ?? '0'}
          />
          {positions.map((position, index) => (
            <PerpsProPositionCard
              key={`${position.symbol}-${index}`}
              position={position}
              testID={getPerpsProPositionRowSelector(position.symbol, index)}
            />
          ))}
        </Box>
      );
    }

    // Avoid flashing the empty state while the first stream update is pending.
    if (isInitialLoading) {
      return null;
    }

    return (
      <Box twClassName="items-center justify-center px-4 pt-6">
        <PerpsProPositionsEmptyState />
      </Box>
    );
  };

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
      {activeIndex === ORDERS_TAB_INDEX ? (
        <Box twClassName="items-center justify-center px-4 pt-6">
          <PerpsProOrdersEmptyState />
        </Box>
      ) : (
        renderPositionsTab()
      )}
    </Box>
  );
};

export default PerpsProPositionsPanel;
