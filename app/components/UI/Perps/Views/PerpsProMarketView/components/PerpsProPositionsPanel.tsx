import { Box, Checkbox } from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import React, { useMemo, useState } from 'react';
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

interface PerpsProPositionsPanelProps {
  symbol: string;
}

/**
 * Pro-mode positions/orders section.
 *
 * Renders the two-tab bar (Positions / Orders) matching the Figma design.
 * The Positions tab shows a read-only list of the user's open positions
 * across all assets, falling back to an empty state when there are none.
 * The Orders tab currently shows its empty state — no ticket scopes its
 * populated content yet.
 */
const PerpsProPositionsPanel = ({ symbol }: PerpsProPositionsPanelProps) => {
  const [activeIndex, setActiveIndex] = useState(POSITIONS_TAB_INDEX);
  const [isTickerOnly, setIsTickerOnly] = useState(false);
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

  const visiblePositions = useMemo(
    () =>
      isTickerOnly
        ? positions.filter(
            (position) => getPerpsDisplaySymbol(position.symbol) === symbol,
          )
        : positions,
    [isTickerOnly, positions, symbol],
  );

  const filteredTotals = useMemo(() => {
    const unrealizedPnl = visiblePositions.reduce(
      (total, position) => total + parseFloat(position.unrealizedPnl || '0'),
      0,
    );
    const marginUsed = visiblePositions.reduce(
      (total, position) => total + parseFloat(position.marginUsed || '0'),
      0,
    );

    return {
      unrealizedPnl: unrealizedPnl.toString(),
      returnOnEquity:
        marginUsed > 0 ? ((unrealizedPnl / marginUsed) * 100).toString() : '0',
    };
  }, [visiblePositions]);

  const hasPositions = visiblePositions.length > 0;

  const renderPositionsTab = () => {
    if (hasPositions) {
      return (
        <Box testID={PerpsProMarketViewSelectorsIDs.POSITIONS_LIST}>
          <PerpsProUnrealizedPnl
            unrealizedPnl={
              isTickerOnly
                ? filteredTotals.unrealizedPnl
                : (account?.unrealizedPnl ?? filteredTotals.unrealizedPnl)
            }
            returnOnEquity={
              isTickerOnly
                ? filteredTotals.returnOnEquity
                : (account?.returnOnEquity ?? filteredTotals.returnOnEquity)
            }
          />
          {visiblePositions.map((position, index) => (
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
      {activeIndex === POSITIONS_TAB_INDEX && (
        <Box twClassName="items-start px-4 pt-3">
          <Checkbox
            label={strings('perps.pro_positions_panel.ticker_only', {
              ticker: symbol,
            })}
            isSelected={isTickerOnly}
            onChange={setIsTickerOnly}
            testID={PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY}
          />
        </Box>
      )}
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
