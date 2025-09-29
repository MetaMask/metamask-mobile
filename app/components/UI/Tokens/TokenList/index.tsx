import React, { useCallback, useRef, useMemo } from 'react';
import { View, RefreshControl, VirtualizedList } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import createStyles from '../styles';
import TextComponent, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { TokenI } from '../types';
import { strings } from '../../../../../locales/i18n';
import { TokenListFooter } from './TokenListFooter';
import { TokenListItem, TokenListItemBip44 } from './TokenListItem';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';

export interface VirtualizedListAssetKey {
  address: string;
  chainId: string | undefined;
  isStaked: boolean | undefined;
}

// Keep the old export for backward compatibility
export interface FlashListAssetKey {
  address: string;
  chainId: string | undefined;
  isStaked: boolean | undefined;
}

interface TokenListProps {
  tokenKeys: VirtualizedListAssetKey[];
  refreshing: boolean;
  onRefresh: () => void;
  showRemoveMenu: (arg: TokenI) => void;
  showPercentageChange?: boolean;
  setShowScamWarningModal: () => void;
}

const TokenListComponent = ({
  tokenKeys,
  refreshing,
  onRefresh,
  showRemoveMenu,
  showPercentageChange = true,
  setShowScamWarningModal,
}: TokenListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);

  // BIP44 MAINTENANCE: Once stable, only use TokenListItemBip44
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const TokenListItemComponent = useMemo(
    () =>
      isMultichainAccountsState2Enabled ? TokenListItemBip44 : TokenListItem,
    [isMultichainAccountsState2Enabled],
  );

  const listRef = useRef<VirtualizedList<VirtualizedListAssetKey>>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();

  const handleLink = useCallback(() => {
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.ONBOARDING.GENERAL_SETTINGS,
    });
  }, [navigation]);

  const MemoizedTokenListItem = useMemo(
    () => React.memo(TokenListItemComponent),
    [TokenListItemComponent],
  );

  const renderTokenListItem = useCallback(
    ({ item }: { item: VirtualizedListAssetKey }) => (
      <MemoizedTokenListItem
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
      MemoizedTokenListItem,
    ],
  );

  const getItem = useCallback(
    (data: VirtualizedListAssetKey[], index: number) => data[index],
    [],
  );

  const getItemCount = useCallback(
    (data: VirtualizedListAssetKey[]) => data.length,
    [],
  );

  const keyExtractor = useCallback((item: VirtualizedListAssetKey) => {
    const staked = item.isStaked ? 'staked' : 'unstaked';
    return `${item.address}-${item.chainId}-${staked}`;
  }, []);

  return tokenKeys?.length ? (
    <>
      <VirtualizedList
        ref={listRef}
        testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
        data={tokenKeys}
        initialNumToRender={6}
        renderItem={renderTokenListItem}
        keyExtractor={keyExtractor}
        getItemCount={getItemCount}
        getItem={getItem}
        ListFooterComponent={<TokenListFooter />}
        refreshControl={
          <RefreshControl
            colors={[colors.primary.default]}
            tintColor={colors.icon.default}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        scrollEnabled={false}
        removeClippedSubviews
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </>
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

export const TokenList = React.memo(
  TokenListComponent,
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders

    // Check if tokenKeys array has the same length and same items
    if (prevProps.tokenKeys.length !== nextProps.tokenKeys.length) {
      return false;
    }

    // Check if all tokenKeys are the same (shallow comparison of each item)
    for (let i = 0; i < prevProps.tokenKeys.length; i++) {
      const prev = prevProps.tokenKeys[i];
      const next = nextProps.tokenKeys[i];
      if (
        prev.address !== next.address ||
        prev.chainId !== next.chainId ||
        prev.isStaked !== next.isStaked
      ) {
        return false;
      }
    }

    // Check other props
    return (
      prevProps.refreshing === nextProps.refreshing &&
      prevProps.onRefresh === nextProps.onRefresh &&
      prevProps.showRemoveMenu === nextProps.showRemoveMenu &&
      prevProps.showPercentageChange === nextProps.showPercentageChange &&
      prevProps.setShowScamWarningModal === nextProps.setShowScamWarningModal
    );
  },
);
TokenList.displayName = 'TokenList';
