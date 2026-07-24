import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl, ScrollViewProps, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import {
  selectDeFiPositionsByAddress,
  selectDefiPositionsByEnabledNetworks,
} from '../../../selectors/defiPositionsController';
import { selectDeFiPositionsV2SectionEnabled } from '../../../selectors/deFiPositionsV2SectionEnabled';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import styleSheet from './DeFiPositionsList.styles';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import {
  selectPrivacyMode,
  selectTokenSortConfig,
} from '../../../selectors/preferencesController';
import { toHex } from '@metamask/controller-utils';
import { sortAssets } from '../Tokens/util';
import DeFiPositionsListItem from './DeFiPositionsListItem';
import DeFiPositionsListItemV2 from './DeFiPositionsListItemV2';
import DeFiPositionsControlBar from './DeFiPositionsControlBar';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { DefiEmptyState } from '../DefiEmptyState';
import ConditionalScrollView from '../../../component-library/components-temp/ConditionalScrollView';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import { useTheme } from '../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getMaybeHexChainId } from '../../../util/bridge';
import { useDeFiPositionsV2 } from '../../Views/Homepage/Sections/DeFi/hooks/useDeFiPositionsV2';

export interface DeFiPositionsListProps {
  tabLabel: string;
  isFullView?: boolean;
}

const DeFiPositionsList: React.FC<DeFiPositionsListProps> = ({
  isFullView = false,
}) => {
  const { styles } = useStyles(styleSheet, undefined);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedScreenViewRef = useRef(false);
  const isV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const defiPositions = useSelector(selectDeFiPositionsByAddress);
  const defiPositionsByEnabledNetworks = useSelector(
    selectDefiPositionsByEnabledNetworks,
  );
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const { colors } = useTheme();
  const tw = useTailwind();
  const [refreshing, setRefreshing] = useState(false);

  const {
    positions: v2Positions,
    isLoading: v2IsLoading,
    isError: v2IsError,
    refresh: refreshV2,
  } = useDeFiPositionsV2({
    enabled: isV2Enabled,
    // Full view / list surface is the viewport — fetch immediately when mounted.
    isVisible: isV2Enabled,
  });

  const formattedDeFiPositionsV2 = useMemo(() => {
    const enabledEvmNetworks =
      enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155] ?? {};
    const enabledHexChainIds = new Set(
      Object.keys(enabledEvmNetworks).filter(
        (chainId) => enabledEvmNetworks[chainId as Hex],
      ),
    );

    const filtered = v2Positions.filter((position) => {
      const hexChainId = getMaybeHexChainId(position.chainId);
      if (hexChainId) {
        return enabledHexChainIds.has(hexChainId);
      }
      // Non-EVM (e.g. Solana): include when present in V2 results.
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  }, [v2Positions, enabledNetworksByNamespace, tokenSortConfig]);

  const formattedDeFiPositions = useMemo(() => {
    if (isV2Enabled) {
      return formattedDeFiPositionsV2;
    }

    if (!defiPositions) {
      return defiPositions;
    }

    const chainFilteredDeFiPositions = defiPositionsByEnabledNetworks as {
      [key: Hex]: GroupedDeFiPositions;
    };

    if (!chainFilteredDeFiPositions) {
      return [];
    }

    const defiPositionsList = Object.entries(chainFilteredDeFiPositions)
      .map(([chainId, chainDeFiPositions]) =>
        Object.entries(chainDeFiPositions.protocols).map(
          ([protocolId, protocolAggregate]) => ({
            chainId: toHex(chainId),
            protocolId,
            protocolAggregate,
          }),
        ),
      )
      .flat();

    const defiSortConfig = {
      ...tokenSortConfig,
      key:
        tokenSortConfig.key === 'tokenFiatAmount'
          ? 'protocolAggregate.aggregatedMarketValue'
          : 'protocolAggregate.protocolDetails.name',
    };

    return sortAssets(defiPositionsList, defiSortConfig);
  }, [
    isV2Enabled,
    formattedDeFiPositionsV2,
    defiPositions,
    tokenSortConfig,
    defiPositionsByEnabledNetworks,
  ]);

  const handleDeFiRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isV2Enabled) {
        await refreshV2();
      } else {
        await Engine.context.DeFiPositionsController._executePoll();
      }
    } finally {
      setRefreshing(false);
    }
  }, [isV2Enabled, refreshV2]);

  const scrollViewProps = useMemo((): ScrollViewProps => {
    const base: ScrollViewProps = {
      testID: WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
    };
    if (!isFullView) {
      return base;
    }
    const listLength = Array.isArray(formattedDeFiPositions)
      ? formattedDeFiPositions.length
      : 0;
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
    formattedDeFiPositions,
    refreshing,
    handleDeFiRefresh,
    colors.primary.default,
    colors.icon.default,
    tw,
  ]);

  useEffect(() => {
    if (
      !isFullView ||
      !Array.isArray(formattedDeFiPositions) ||
      hasTrackedScreenViewRef.current
    )
      return;
    hasTrackedScreenViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.POSITION_SCREEN_VIEWED)
        .addProperties({
          item_count: formattedDeFiPositions.length,
          location: 'homepage',
          is_empty: formattedDeFiPositions.length === 0,
          screen_type: 'defi',
        })
        .build(),
    );
  }, [isFullView, formattedDeFiPositions, trackEvent, createEventBuilder]);

  if (isV2Enabled) {
    if (v2IsLoading) {
      return (
        <View style={styles.emptyView}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.loading_positions')}
          </Text>
        </View>
      );
    }

    if (v2IsError) {
      return (
        <View style={styles.emptyView}>
          <Icon
            name={IconName.Danger}
            color={IconColor.Alternative}
            size={IconSize.Md}
          />
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.error_cannot_load_page')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.error_visit_again')}
          </Text>
        </View>
      );
    }
  } else if (!formattedDeFiPositions) {
    if (formattedDeFiPositions === undefined) {
      // Position data is still loading
      return (
        <View style={styles.emptyView}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.loading_positions')}
          </Text>
        </View>
      );
    } else if (formattedDeFiPositions === null) {
      // Error fetching position data
      return (
        <View style={styles.emptyView}>
          <Icon
            name={IconName.Danger}
            color={IconColor.Alternative}
            size={IconSize.Md}
          />
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.error_cannot_load_page')}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('defi_positions.error_visit_again')}
          </Text>
        </View>
      );
    }
  }

  const content = (
    <View testID={WalletViewSelectorsIDs.DEFI_POSITIONS_LIST}>
      {isV2Enabled
        ? formattedDeFiPositionsV2.map((position) => (
            <DeFiPositionsListItemV2
              key={`${position.chainId}-${position.protocolId}`}
              position={position}
              privacyMode={privacyMode}
            />
          ))
        : (
            formattedDeFiPositions as {
              chainId: Hex;
              protocolId: string;
              protocolAggregate: GroupedDeFiPositions['protocols'][number];
            }[]
          ).map(({ chainId, protocolId, protocolAggregate }) => (
            <DeFiPositionsListItem
              key={`${chainId}-${protocolAggregate.protocolDetails.name}`}
              chainId={chainId}
              protocolId={protocolId}
              protocolAggregate={protocolAggregate}
              privacyMode={privacyMode}
            />
          ))}
    </View>
  );

  const listLength = isV2Enabled
    ? formattedDeFiPositionsV2.length
    : Array.isArray(formattedDeFiPositions)
      ? formattedDeFiPositions.length
      : 0;

  const listBody =
    listLength > 0 ? content : <DefiEmptyState twClassName="mx-auto mt-4" />;

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

export default DeFiPositionsList;
