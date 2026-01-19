import React, { useState, memo, useCallback, useEffect, useMemo } from 'react';
import { InteractionManager, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
} from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import { TokenList } from './TokenList/TokenList';
import { TokenI } from './types';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { strings } from '../../../../locales/i18n';
import {
  refreshTokens,
  removeEvmToken,
  removeNonEvmToken,
  goToAddEvmToken,
} from './util';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Box } from '@metamask/design-system-react-native';
import { TokenListControlBar } from './TokenListControlBar/TokenListControlBar';
import { selectSelectedInternalAccountId } from '../../../selectors/accountsController';
import { ScamWarningModal } from './TokenList/ScamWarningModal/ScamWarningModal';
import TokenListSkeleton from './TokenList/TokenListSkeleton/TokenListSkeleton';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { SolScope } from '@metamask/keyring-api';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
import { TokensEmptyState } from '../TokensEmptyState';
import MusdConversionAssetListCta from '../Earn/components/Musd/MusdConversionAssetListCta';
import { selectIsMusdConversionFlowEnabledFlag } from '../Earn/selectors/featureFlags';
import RemoveTokenBottomSheet from './TokenList/RemoveTokenBottomSheet';

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface TokensProps {
  /**
   * Whether this is the full view (with header and safe area) or tab view
   */
  isFullView?: boolean;
}

const Tokens = memo(({ isFullView = false }: TokensProps) => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const { trackEvent, createEventBuilder } = useMetrics();
  const tw = useTailwind();

  // evm
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const currentChainId = useSelector(selectChainId);
  const nativeCurrencies = useSelector(selectNativeNetworkCurrencies);

  const [refreshing, setRefreshing] = useState(false);
  const [removeTokenState, setRemoveTokenState] = useState<
    { isVisible: true; token: TokenI } | { isVisible: false }
  >({ isVisible: false });
  const selectedAccountId = useSelector(selectSelectedInternalAccountId);

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;
  const isSolanaSelected = selectedSolanaAccount !== null;

  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Memoize selector computation for better performance
  const sortedTokenKeys = useSelector(selectSortedAssetsBySelectedAccountGroup);

  const [, forceUpdate] = useState(0);

  // Force re-render when coming back into focus to ensure the component
  // picks up any network changes that happened while navigated away
  // (e.g., when returning from trending flow after network switch)
  useFocusEffect(
    useCallback(() => {
      forceUpdate((n) => n + 1);
    }, []),
  );

  // Mark as loaded once we have data (even if empty)
  useEffect(() => {
    if (!hasInitialLoad && sortedTokenKeys) {
      InteractionManager.runAfterInteractions(() => {
        setHasInitialLoad(true);
      });
    }
  }, [sortedTokenKeys, hasInitialLoad]);

  const showRemoveMenu = useCallback((token: TokenI) => {
    setRemoveTokenState({ isVisible: true, token });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Use InteractionManager for better performance during refresh
    InteractionManager.runAfterInteractions(() => {
      refreshTokens({
        isSolanaSelected,
        evmNetworkConfigurationsByChainId,
        nativeCurrencies,
        selectedAccountId,
      });
      setRefreshing(false);
    });
  }, [
    isSolanaSelected,
    evmNetworkConfigurationsByChainId,
    nativeCurrencies,
    selectedAccountId,
  ]);

  const removeToken = useCallback(async () => {
    if (!removeTokenState.isVisible) return;

    const tokenToRemove = removeTokenState.token;

    // Reset state immediately to prevent issues if onClose fires first
    setRemoveTokenState({ isVisible: false });

    if (tokenToRemove?.chainId !== undefined) {
      if (isNonEvmChainId(tokenToRemove.chainId)) {
        await removeNonEvmToken({
          tokenAddress: tokenToRemove.address,
          tokenChainId: tokenToRemove.chainId,
          selectInternalAccountByScope,
        });
      } else {
        await removeEvmToken({
          tokenToRemove,
          currentChainId,
          trackEvent,
          strings,
          getDecimalChainId,
          createEventBuilder,
        });
      }
    }
  }, [
    removeTokenState,
    currentChainId,
    trackEvent,
    createEventBuilder,
    selectInternalAccountByScope,
  ]);

  const goToAddToken = useCallback(() => {
    goToAddEvmToken({
      navigation,
      trackEvent,
      createEventBuilder,
      getDecimalChainId,
      currentChainId,
    });
  }, [navigation, trackEvent, createEventBuilder, currentChainId]);

  const handleCloseRemoveTokenBottomSheet = useCallback(() => {
    setRemoveTokenState({ isVisible: false });
  }, []);

  const handleScamWarningModal = useCallback(() => {
    setShowScamWarningModal((prev) => !prev);
  }, []);

  const maxItems = useMemo(() => {
    if (isFullView) {
      return undefined;
    }
    return isHomepageRedesignV1Enabled ? 10 : undefined;
  }, [isFullView, isHomepageRedesignV1Enabled]);

  // Determine which content to render based on loading and token state
  const tokenContent = useMemo(() => {
    if (!hasInitialLoad) {
      return (
        <Box twClassName={isFullView ? 'px-4' : undefined}>
          <TokenListSkeleton />
        </Box>
      );
    }

    if (sortedTokenKeys.length > 0) {
      return (
        <>
          {isMusdConversionFlowEnabled && (
            <View style={isFullView ? tw`px-4` : undefined}>
              <MusdConversionAssetListCta />
            </View>
          )}
          <TokenList
            tokenKeys={sortedTokenKeys}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showRemoveMenu={showRemoveMenu}
            setShowScamWarningModal={handleScamWarningModal}
            maxItems={maxItems}
            isFullView={isFullView}
          />
        </>
      );
    }

    return (
      <Box twClassName={isFullView ? 'px-4 items-center' : 'items-center'}>
        <TokensEmptyState />
      </Box>
    );
  }, [
    hasInitialLoad,
    isFullView,
    sortedTokenKeys,
    isMusdConversionFlowEnabled,
    tw,
    refreshing,
    onRefresh,
    showRemoveMenu,
    handleScamWarningModal,
    maxItems,
  ]);

  return (
    <Box
      twClassName={
        isHomepageRedesignV1Enabled && !isFullView
          ? 'bg-default'
          : 'flex-1 bg-default'
      }
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      <TokenListControlBar
        goToAddToken={goToAddToken}
        style={isFullView ? tw`px-4 pb-4` : undefined}
      />
      {tokenContent}
      <ScamWarningModal
        showScamWarningModal={showScamWarningModal}
        setShowScamWarningModal={setShowScamWarningModal}
      />
      <RemoveTokenBottomSheet
        isVisible={removeTokenState.isVisible}
        onClose={handleCloseRemoveTokenBottomSheet}
        onRemove={removeToken}
      />
    </Box>
  );
});

Tokens.displayName = 'Tokens';

export default Tokens;
