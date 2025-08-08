import React, { useCallback, useState } from 'react';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { View, Modal } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import TabBar from '../../../../../component-library/components-temp/TabBar';
import { useStyles } from '../../../../hooks/useStyles';
import PerpsMarketStatisticsCard from '../PerpsMarketStatisticsCard';
import PerpsPositionCard from '../PerpsPositionCard';
import { MarketDetailsTabsProps, TabViewProps } from './PerpsMarketTabs.types';
import styleSheet from './PerpsMarketTabs.styles';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const MarketDetailsTabs: React.FC<MarketDetailsTabsProps> = ({
  marketStats,
  position,
  isLoadingPosition,
  unfilledOrders = [],
}) => {
  const { styles } = useStyles(styleSheet, {});

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  const renderTooltipModal = useCallback(() => {
    if (!selectedTooltip) return null;

    return (
      /**
       * Wrapping PerpsBottomSheetTooltip in a Modal to ensure it renders at the root level
       * Without this, the tooltip background would only fill the MarketDetailsTabs container.
       */
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
          key={selectedTooltip}
        />
      </Modal>
    );
  }, [selectedTooltip, handleTooltipClose]);

  if (isLoadingPosition || (!position && unfilledOrders.length === 0)) {
    return (
      <>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.statisticsTitle}
        >
          {strings('perps.market.statistics')}
        </Text>

        <PerpsMarketStatisticsCard
          marketStats={marketStats}
          onTooltipPress={handleTooltipPress}
        />
        {renderTooltipModal()}
      </>
    );
  }

  return (
    <>
      <ScrollableTabView
        renderTabBar={() => <TabBar tabStyle={styles.tabStyle} />}
        initialPage={0}
      >
        {/* Position Tab */}
        {Boolean(position) && !isLoadingPosition && (
          <View
            key="position"
            style={styles.tabContainer}
            {...({
              tabLabel: strings('perps.market.position'),
            } as TabViewProps)}
          >
            {isLoadingPosition && (
              <View>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {strings('perps.loading_positions')}
                </Text>
              </View>
            )}
            {position && (
              <PerpsPositionCard
                key={`${position.coin}`}
                position={position}
                expanded
                showIcon
              />
            )}
          </View>
        )}

        {/* Market Info Tab */}
        <View
          key="market-info"
          style={styles.tabContainer}
          {...({
            tabLabel: strings('perps.market.statistics'),
          } as TabViewProps)}
        >
          <PerpsMarketStatisticsCard
            marketStats={marketStats}
            onTooltipPress={handleTooltipPress}
          />
        </View>

        <View
          key="order-book"
          style={styles.tabContainer}
          {...({ tabLabel: strings('perps.market.orders') } as TabViewProps)}
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            Order Book Content Coming Soon
          </Text>
        </View>
      </ScrollableTabView>
      {renderTooltipModal()}
    </>
  );
};

export default MarketDetailsTabs;
