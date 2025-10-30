import React, { useCallback, useLayoutEffect, useRef, useMemo } from 'react';
import { View, RefreshControl } from 'react-native';
import { FlashList, FlashListRef, FlashListProps } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import {
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  selectPrivacyMode,
} from '../../../../selectors/preferencesController';
import createStyles from '../styles';
import TextComponent, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListItemBip44 } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';

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
  flashListProps?: Partial<FlashListProps<FlashListAssetKey>>;
  maxItems?: number;
}

const TokenListComponent = ({
  tokenKeys,
  refreshing,
  onRefresh,
  showRemoveMenu,
  showPercentageChange = true,
  setShowScamWarningModal,
  flashListProps,
  maxItems,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );

  const TokenListItemComponent = TokenListItemBip44;

  const listRef = useRef<FlashListRef<FlashListAssetKey>>(null);

  const styles = createStyles(colors);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    listRef.current?.recomputeViewableItems();
  }, [isTokenNetworkFilterEqualCurrentNetwork]);

  const handleLink = () => {
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.ONBOARDING.GENERAL_SETTINGS,
    });
  };

  const handleViewAllTokens = useCallback(() => {
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation]);

  // Apply maxItems limit if specified
  const displayTokenKeys = useMemo(() => {
    if (maxItems === undefined) {
      return tokenKeys;
    }
    return tokenKeys?.slice(0, maxItems);
  }, [tokenKeys, maxItems]);

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
      />
    ),
    [
      showRemoveMenu,
      setShowScamWarningModal,
      privacyMode,
      showPercentageChange,
      TokenListItemComponent,
    ],
  );

  return displayTokenKeys?.length ? (
    <Box twClassName="flex-1 bg-default">
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
        scrollEnabled
        {...flashListProps}
      />
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
    <View style={styles.emptyView}>
      <View style={styles.emptyTokensView}>
        <TextComponent style={styles.emptyTokensViewText}>
          {strings('wallet.no_tokens')}
        </TextComponent>
        <TextComponent
          style={styles.emptyTokensViewText}
          color={TextColor.Info}
          onPress={handleLink}
        >
          {strings('wallet.show_tokens_without_balance')}
        </TextComponent>
      </View>
    </View>
  );
};

export const TokenList = React.memo(TokenListComponent);
TokenList.displayName = 'TokenList';
