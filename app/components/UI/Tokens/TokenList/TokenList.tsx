import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { DeviceEventEmitter, RefreshControl } from 'react-native';
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
import { TokenListItemV2 } from './TokenListItemV2/TokenListItemV2';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { selectHomepageRedesignV1Enabled } from '../../../../selectors/featureFlagController/homepage';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { SCROLL_TO_TOKEN_EVENT } from '../constants';
import { selectTokenListLayoutV2Enabled } from '../../../../selectors/featureFlagController/tokenListLayout';

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
  setShowScamWarningModal: () => void;
  maxItems?: number;
  isFullView?: boolean;
}

const TokenListComponent = ({
  tokenKeys,
  refreshing,
  onRefresh,
  showRemoveMenu,
  showPercentageChange = true,
  setShowScamWarningModal,
  maxItems,
  isFullView = false,
}: TokenListProps) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

  // A/B test: Token list item layout (V1 vs V2)
  const isTokenListV2 = useSelector(selectTokenListLayoutV2Enabled);
  const ListItemComponent = isTokenListV2 ? TokenListItemV2 : TokenListItem;

  const listRef = useRef<FlashListRef<FlashListAssetKey>>(null);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  useLayoutEffect(() => {
    listRef.current?.recomputeViewableItems();
  }, [isTokenNetworkFilterEqualCurrentNetwork]);

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

  // Listen for scroll-to-token events (e.g., after claiming mUSD rewards)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      SCROLL_TO_TOKEN_EVENT,
      ({ address, chainId }: { address: string; chainId: string }) => {
        // Find the index of the token in the display list
        const tokenIndex = displayTokenKeys.findIndex(
          (item) =>
            item.address?.toLowerCase() === address?.toLowerCase() &&
            item.chainId === chainId,
        );

        if (tokenIndex === -1) {
          return;
        }

        // For FlashList mode, use scrollToIndex
        if (!isHomepageRedesignV1Enabled || isFullView) {
          if (listRef.current) {
            listRef.current.scrollToIndex({
              index: tokenIndex,
              animated: true,
              viewPosition: 0.5, // Center the item in the viewport
            });
          }
        } else {
          // For .map() mode, emit event with index for parent ScrollView to handle
          // Approximate token row height is ~72px
          const TOKEN_ROW_HEIGHT = 72;
          DeviceEventEmitter.emit('scrollToTokenIndex', {
            index: tokenIndex,
            offset: tokenIndex * TOKEN_ROW_HEIGHT,
          });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [displayTokenKeys, isHomepageRedesignV1Enabled, isFullView]);

  const handleViewAllTokens = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.VIEW_ALL_ASSETS_CLICKED)
        .addProperties({ asset_type: 'Token' })
        .build(),
    );
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation, trackEvent, createEventBuilder]);

  const renderTokenListItem = useCallback(
    ({ item }: { item: FlashListAssetKey }) => (
      <ListItemComponent
        assetKey={item}
        showRemoveMenu={showRemoveMenu}
        setShowScamWarningModal={setShowScamWarningModal}
        privacyMode={privacyMode}
        showPercentageChange={showPercentageChange}
        isFullView={isFullView}
      />
    ),
    [
      ListItemComponent,
      showRemoveMenu,
      setShowScamWarningModal,
      privacyMode,
      showPercentageChange,
      isFullView,
    ],
  );

  const tokenList =
    isHomepageRedesignV1Enabled && !isFullView ? (
      <Box
        twClassName={'bg-default'}
        testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
      >
        {displayTokenKeys.map((item, index) => (
          <ListItemComponent
            key={`${item.address}-${item.chainId}-${item.isStaked ? 'staked' : 'unstaked'}-${index}`}
            assetKey={item}
            showRemoveMenu={showRemoveMenu}
            setShowScamWarningModal={setShowScamWarningModal}
            privacyMode={privacyMode}
            showPercentageChange={showPercentageChange}
            isFullView={isFullView}
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
      </Box>
    ) : (
      <Box twClassName={'flex-1 bg-default'}>
        <FlashList
          ref={listRef}
          testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
          data={displayTokenKeys}
          removeClippedSubviews={false}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 1000,
          }}
          renderItem={renderTokenListItem}
          keyExtractor={(item, idx) => {
            const staked = item.isStaked ? 'staked' : 'unstaked';
            return `${item.address}-${item.chainId}-${staked}-${idx}`;
          }}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          extraData={{ isTokenNetworkFilterEqualCurrentNetwork }}
          contentContainerStyle={!isFullView ? undefined : tw`px-4`}
        />
      </Box>
    );

  return tokenList;
};

export const TokenList = React.memo(TokenListComponent);
TokenList.displayName = 'TokenList';
