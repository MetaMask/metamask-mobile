import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, View } from 'react-native';
import { useSelector } from 'react-redux';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import {
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from '../../../DeFiPositions/DeFiPositionsList.styles';
import {
  selectPrivacyMode,
  selectTokenSortConfig,
} from '../../../../../selectors/preferencesController';
import { selectEnabledNetworksByNamespace } from '../../../../../selectors/networkEnablementController';
import { useStyles } from '../../../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { DefiEmptyState } from '../../../DefiEmptyState';
import DeFiPositionsControlBar from '../../../DeFiPositions/DeFiPositionsControlBar';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import DeFiPositionsListItemV2 from './DeFiPositionsListItemV2';
import { useDeFiPositionsV2 } from '../hooks/useDeFiPositionsV2';
import { filterDeFiPositionsByEnabledNetworks } from '../utils/filter-defi-positions-by-enabled-networks';

interface DeFiPositionsListV2Props {
  isFullView: boolean;
}

const getPositionKey = (position: DeFiProtocolPositionGroup): string =>
  `${position.chainId}-${position.protocolId}`;

/**
 * DeFiPositionsListV2 - full view / list backed by the on-demand V2 controller.
 * Fetches immediately (the full-view surface is the viewport), filters to the
 * enabled EVM networks, sorts per user preference, and renders the list chrome.
 *
 * Matches TokenList: FlashList when this component owns scrolling (`isFullView`),
 * `.map()` when nested in a parent scroll.
 */
const DeFiPositionsListV2: React.FC<DeFiPositionsListV2Props> = ({
  isFullView,
}) => {
  const { styles } = useStyles(styleSheet, undefined);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { colors } = useTheme();
  const tw = useTailwind();
  const hasTrackedScreenViewRef = useRef(false);

  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const privacyMode = useSelector(selectPrivacyMode);
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );
  const [refreshing, setRefreshing] = useState(false);

  const { positions, isLoading, isError, hasFetched, refresh } =
    useDeFiPositionsV2({
      enabled: true,
      // Full view / list surface is the viewport — fetch immediately when mounted.
      isVisible: true,
    });

  const formattedPositions = useMemo(() => {
    const filtered = filterDeFiPositionsByEnabledNetworks(
      positions,
      enabledNetworksByNamespace,
    );

    return [...filtered].sort((a, b) => {
      if (tokenSortConfig.key === 'tokenFiatAmount') {
        return tokenSortConfig.order === 'dsc'
          ? b.marketValue - a.marketValue
          : a.marketValue - b.marketValue;
      }
      const nameA = a.protocolId.toLowerCase();
      const nameB = b.protocolId.toLowerCase();
      return tokenSortConfig.order === 'dsc'
        ? nameB.localeCompare(nameA)
        : nameA.localeCompare(nameB);
    });
  }, [positions, enabledNetworksByNamespace, tokenSortConfig]);

  const handleDeFiRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const renderPositionItem = useCallback<
    ListRenderItem<DeFiProtocolPositionGroup>
  >(
    ({ item }) => (
      <DeFiPositionsListItemV2 position={item} privacyMode={privacyMode} />
    ),
    [privacyMode],
  );

  const listLength = formattedPositions.length;
  // Idle before the deferred first fetch settles looks like loaded-empty
  // (isLoading false, positions []). Gate on hasFetched like DeFiSectionV2.
  const isReady = hasFetched && !isLoading && !isError;
  const showIdlePlaceholder = !hasFetched && !isLoading && !isError;

  const refreshControl = (
    <RefreshControl
      colors={[colors.primary.default]}
      tintColor={colors.icon.default}
      refreshing={refreshing}
      onRefresh={handleDeFiRefresh}
    />
  );

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

  if (isLoading || showIdlePlaceholder) {
    return (
      <View style={styles.emptyView}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('defi_positions.loading_positions')}
        </Text>
      </View>
    );
  }

  if (isError) {
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

  const emptyState = <DefiEmptyState twClassName="mx-auto mt-4" />;

  const listBody = isFullView ? (
    <FlashList
      data={formattedPositions}
      renderItem={renderPositionItem}
      keyExtractor={getPositionKey}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
      refreshControl={refreshControl}
      ListEmptyComponent={emptyState}
      contentContainerStyle={listLength === 0 ? tw`flex-grow` : undefined}
    />
  ) : listLength > 0 ? (
    <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}>
      {formattedPositions.map((position) => (
        <DeFiPositionsListItemV2
          key={getPositionKey(position)}
          position={position}
          privacyMode={privacyMode}
        />
      ))}
    </View>
  ) : (
    emptyState
  );

  return (
    <View
      style={isFullView ? styles.wrapper : undefined}
      testID={WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER}
    >
      <DeFiPositionsControlBar />
      {listBody}
    </View>
  );
};

export default DeFiPositionsListV2;
