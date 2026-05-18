import React, { useCallback, useRef, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import {
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  selectPrivacyMode,
} from '../../../../selectors/preferencesController';

import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListItem } from './TokenListItem/TokenListItem';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useMusdCtaVisibility } from '../../Earn/hooks/useMusdCtaVisibility';
import { useTokenListScrollAfterClaim } from '../../Earn/hooks/useTokenListScrollAfterClaim';

export interface FlashListAssetKey {
  address: string;
  chainId: string | undefined;
  isStaked: boolean | undefined;
}

interface TokenListProps {
  tokenKeys: FlashListAssetKey[];
  refreshing: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
  showPercentageChange?: boolean;
  setShowScamWarningModal: (chainId: string | null) => void;
  maxItems?: number;
  isFullView?: boolean;
  listHeaderComponent?: React.ReactElement;
  listFooterComponent?: React.ReactElement;
  /**
   * Optional external RefreshControl. When provided, overrides the internal
   * one wired via `refreshing` + `onRefresh` so callers can compose their own
   * refresh orchestrator (e.g. Money Hub).
   */
  refreshControl?: React.ReactElement;
  /**
   * When true, mUSD rows render only the native balance on the secondary row
   * (no token price / 24h change). Used by the Money Hub.
   */
  hideSecondaryPriceRow?: boolean;
}

const wrapEdgeNode = (
  node: React.ReactElement | undefined,
  isFullView: boolean,
) => (isFullView && node ? <Box twClassName="-mx-4">{node}</Box> : node);

const TokenListComponent = ({
  tokenKeys,
  refreshing,
  onRefresh,
  showRemoveMenu,
  showPercentageChange = true,
  setShowScamWarningModal,
  maxItems,
  isFullView = false,
  listHeaderComponent,
  listFooterComponent,
  refreshControl,
  hideSecondaryPriceRow = false,
}: TokenListProps) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );

  // Declaring this here and passing it down to avoid O(n) API calls to on-ramp
  const { shouldShowTokenListItemCta } = useMusdCtaVisibility();

  const listRef = useRef<FlashListRef<FlashListAssetKey>>(null);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Apply maxItems limit if specified
  const displayTokenKeys = useMemo(
    () => (tokenKeys || []).slice(0, maxItems || undefined),
    [tokenKeys, maxItems],
  );

  // Determine if we should show the "View all tokens" button
  const shouldShowViewAllButton = useMemo(
    () => maxItems !== undefined && tokenKeys && tokenKeys.length > maxItems,
    [maxItems, tokenKeys],
  );

  // Scroll to token after mUSD reward claims (@metamask/earn)
  useTokenListScrollAfterClaim({ listRef, displayTokenKeys, isFullView });

  const handleViewAllTokens = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.VIEW_ALL_ASSETS_CLICKED)
        .addProperties({ asset_type: 'Token' })
        .build(),
    );
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation, trackEvent, createEventBuilder]);

  const getTokenKey = useCallback(
    (item: FlashListAssetKey): string =>
      `${item.address}-${item.chainId}-${item.isStaked ? 'staked' : 'unstaked'}`,
    [],
  );

  const renderTokenListItem = useCallback(
    ({ item }: { item: FlashListAssetKey }) => (
      <TokenListItem
        assetKey={item}
        showRemoveMenu={showRemoveMenu}
        setShowScamWarningModal={setShowScamWarningModal}
        privacyMode={privacyMode}
        showPercentageChange={showPercentageChange}
        isFullView={isFullView}
        shouldShowTokenListItemCta={shouldShowTokenListItemCta}
        hideSecondaryPriceRow={hideSecondaryPriceRow}
      />
    ),
    [
      showRemoveMenu,
      setShowScamWarningModal,
      privacyMode,
      showPercentageChange,
      isFullView,
      shouldShowTokenListItemCta,
      hideSecondaryPriceRow,
    ],
  );

  const tokenList = !isFullView ? (
    <Box
      twClassName={'bg-default'}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
    >
      {listHeaderComponent}
      {displayTokenKeys.map((item, index) => (
        <TokenListItem
          key={`${getTokenKey(item)}-${index}`}
          assetKey={item}
          showRemoveMenu={showRemoveMenu}
          setShowScamWarningModal={setShowScamWarningModal}
          privacyMode={privacyMode}
          showPercentageChange={showPercentageChange}
          isFullView={isFullView}
          shouldShowTokenListItemCta={shouldShowTokenListItemCta}
          hideSecondaryPriceRow={hideSecondaryPriceRow}
        />
      ))}
      {shouldShowViewAllButton && (
        <Box twClassName="pt-3 pb-9">
          <Button
            variant={ButtonVariant.Secondary}
            onPress={handleViewAllTokens}
            isFullWidth
          >
            {strings('wallet.view_all_tokens')}
          </Button>
        </Box>
      )}
      {listFooterComponent}
    </Box>
  ) : (
    <Box twClassName={'flex-1 bg-default'}>
      <FlashList
        ref={listRef}
        testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
        data={displayTokenKeys}
        removeClippedSubviews={false}
        renderItem={renderTokenListItem}
        keyExtractor={(item, idx) => `${getTokenKey(item)}-${idx}`}
        refreshControl={
          refreshControl ?? (
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )
        }
        extraData={{ isTokenNetworkFilterEqualCurrentNetwork }}
        contentContainerStyle={!isFullView ? undefined : tw`px-4`}
        ListHeaderComponent={wrapEdgeNode(listHeaderComponent, isFullView)}
        ListFooterComponent={wrapEdgeNode(listFooterComponent, isFullView)}
      />
    </Box>
  );

  return tokenList;
};

export const TokenList = React.memo(TokenListComponent);
TokenList.displayName = 'TokenList';
