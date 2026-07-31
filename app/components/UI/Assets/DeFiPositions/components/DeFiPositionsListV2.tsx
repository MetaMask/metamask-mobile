import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, ScrollViewProps, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
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
import { getMaybeHexChainId } from '../../../../../util/bridge';
import { useStyles } from '../../../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { DefiEmptyState } from '../../../DefiEmptyState';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';
import DeFiPositionsControlBar from '../../../DeFiPositions/DeFiPositionsControlBar';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import DeFiPositionsListItemV2 from './DeFiPositionsListItemV2';
import { useDeFiPositionsV2 } from '../hooks/useDeFiPositionsV2';

interface DeFiPositionsListV2Props {
  isFullView: boolean;
}

/**
 * DeFiPositionsListV2 - full view / list backed by the on-demand V2 controller.
 * Fetches immediately (the full-view surface is the viewport), filters to the
 * enabled EVM networks, sorts per user preference, and renders the list chrome.
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

  const { positions, isLoading, isError, refresh } = useDeFiPositionsV2({
    enabled: true,
    // Full view / list surface is the viewport — fetch immediately when mounted.
    isVisible: true,
  });

  const formattedPositions = useMemo(() => {
    const enabledEvmNetworks =
      enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155] ?? {};
    const enabledHexChainIds = new Set(
      Object.keys(enabledEvmNetworks).filter(
        (chainId) => enabledEvmNetworks[chainId as Hex],
      ),
    );

    const filtered = positions.filter((position) => {
      const hexChainId = getMaybeHexChainId(position.chainId);
      if (hexChainId) {
        return enabledHexChainIds.has(hexChainId);
      }
      // Non-EVM (e.g. Solana): include when present in V2 results.
      return true;
    });

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

  const listLength = formattedPositions.length;
  const isReady = !isLoading && !isError;

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
          onRefresh={handleDeFiRefresh}
        />
      ),
      ...(listLength === 0 ? { contentContainerStyle: tw`flex-grow` } : {}),
    };
  }, [
    isFullView,
    listLength,
    refreshing,
    handleDeFiRefresh,
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

  if (isLoading) {
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

  const listBody =
    listLength > 0 ? (
      <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}>
        {formattedPositions.map((position) => (
          <DeFiPositionsListItemV2
            key={`${position.chainId}-${position.protocolId}`}
            position={position}
            privacyMode={privacyMode}
          />
        ))}
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

export default DeFiPositionsListV2;
