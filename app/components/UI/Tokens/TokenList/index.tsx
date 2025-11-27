import React, { useCallback, useLayoutEffect, useRef, useMemo } from 'react';
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
import { TokenListItem, TokenListItemBip44 } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
import { selectHomepageRedesignV1Enabled } from '../../../../selectors/featureFlagController/homepage';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

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

  // BIP44 MAINTENANCE: Once stable, only use TokenListItemBip44
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const TokenListItemComponent = isMultichainAccountsState2Enabled
    ? TokenListItemBip44
    : TokenListItem;

  const listRef = useRef<FlashListRef<FlashListAssetKey>>(null);

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  useLayoutEffect(() => {
    listRef.current?.recomputeViewableItems();
  }, [isTokenNetworkFilterEqualCurrentNetwork]);

  const handleViewAllTokens = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.VIEW_ALL_ASSETS_CLICKED)
        .addProperties({ asset_type: 'Token' })
        .build(),
    );
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation, trackEvent, createEventBuilder]);

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

  const renderTokenListItem = useCallback(
    ({ item }: { item: FlashListAssetKey }) => (
      <TokenListItemComponent
        assetKey={item}
        showRemoveMenu={showRemoveMenu}
        setShowScamWarningModal={setShowScamWarningModal}
        privacyMode={privacyMode}
        showPercentageChange={showPercentageChange}
        isFullView={isFullView}
      />
    ),
    [
      showRemoveMenu,
      setShowScamWarningModal,
      privacyMode,
      showPercentageChange,
      TokenListItemComponent,
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
          <TokenListItemComponent
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
          decelerationRate="fast"
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
