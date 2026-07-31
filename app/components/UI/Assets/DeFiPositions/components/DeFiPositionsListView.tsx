import React, { useEffect, useMemo, useRef } from 'react';
import { RefreshControl, ScrollViewProps, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from '../../../DeFiPositions/DeFiPositionsList.styles';
import {
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { DefiEmptyState } from '../../../DefiEmptyState';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';
import DeFiPositionsControlBar from '../../../DeFiPositions/DeFiPositionsControlBar';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * The presentational state of the DeFi positions list, independent of V1/V2
 * data sources. V1 and V2 map their own state onto this shape.
 */
export type DeFiPositionsListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: React.ReactNode; listLength: number };

interface DeFiPositionsListViewProps {
  state: DeFiPositionsListState;
  isFullView: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

/**
 * Shared chrome for the DeFi positions list: loading / error status, control
 * bar, scroll + pull-to-refresh (full view), empty state, and the
 * "Position Screen Viewed" analytics event. V1 and V2 supply the data-derived
 * {@link DeFiPositionsListState}; everything visual lives here.
 */
const DeFiPositionsListView: React.FC<DeFiPositionsListViewProps> = ({
  state,
  isFullView,
  refreshing,
  onRefresh,
}) => {
  const { styles } = useStyles(styleSheet, undefined);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors } = useTheme();
  const tw = useTailwind();
  const hasTrackedScreenViewRef = useRef(false);

  const isReady = state.status === 'ready';
  const listLength = state.status === 'ready' ? state.listLength : 0;

  const scrollViewProps = useMemo((): ScrollViewProps => {
    const base: ScrollViewProps = {
      testID: WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
    };
    if (!isFullView) {
      return base;
    }
    return {
      ...base,
      refreshControl: (
        <RefreshControl
          colors={[colors.primary.default]}
          tintColor={colors.icon.default}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ),
      ...(listLength === 0 ? { contentContainerStyle: tw`flex-grow` } : {}),
    };
  }, [
    isFullView,
    listLength,
    refreshing,
    onRefresh,
    colors.primary.default,
    colors.icon.default,
    tw,
  ]);

  useEffect(() => {
    if (!isFullView || !isReady || hasTrackedScreenViewRef.current) {
      return;
    }
    hasTrackedScreenViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.POSITION_SCREEN_VIEWED)
        .addProperties({
          item_count: listLength,
          location: 'homepage',
          is_empty: listLength === 0,
          screen_type: 'defi',
        })
        .build(),
    );
  }, [isFullView, isReady, listLength, trackEvent, createEventBuilder]);

  if (state.status === 'loading') {
    return (
      <View style={styles.emptyView}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('defi_positions.loading_positions')}
        </Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.emptyView}>
        <Icon
          name={IconName.Danger}
          color={IconColor.IconAlternative}
          size={IconSize.Md}
        />
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('defi_positions.error_cannot_load_page')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('defi_positions.error_visit_again')}
        </Text>
      </View>
    );
  }

  const listBody =
    listLength > 0 ? (
      <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}>
        {state.items}
      </View>
    ) : (
      <DefiEmptyState twClassName="mx-auto mt-4" />
    );

  return (
    <View
      style={isFullView ? styles.wrapper : undefined}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}
    >
      <DeFiPositionsControlBar />
      <ConditionalScrollView
        isScrollEnabled={isFullView}
        scrollViewProps={isFullView ? scrollViewProps : undefined}
      >
        {listBody}
      </ConditionalScrollView>
    </View>
  );
};

export default DeFiPositionsListView;
