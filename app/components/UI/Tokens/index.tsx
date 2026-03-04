import React, {
  useState,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { TabRefreshHandle } from '../../Views/Wallet/types';
import { InteractionManager, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import { TokenList } from './TokenList/TokenList';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import { refreshTokens, goToAddEvmToken } from './util';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { TokenListControlBar } from './TokenListControlBar/TokenListControlBar';
import { selectSelectedInternalAccountId } from '../../../selectors/accountsController';
import { ScamWarningModal } from './TokenList/ScamWarningModal/ScamWarningModal';
import TokenListSkeleton from './TokenList/TokenListSkeleton/TokenListSkeleton';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { SolScope } from '@metamask/keyring-api';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
import { useRemoveToken } from './hooks/useRemoveToken';
import { TokensEmptyState } from '../TokensEmptyState';
import MusdConversionAssetListCta from '../Earn/components/Musd/MusdConversionAssetListCta';
import { selectIsMusdConversionFlowEnabledFlag } from '../Earn/selectors/featureFlags';
import RemoveTokenBottomSheet from './TokenList/RemoveTokenBottomSheet';
import { useMusdConversionEligibility } from '../Earn/hooks/useMusdConversionEligibility';

interface TokensProps {
  /**
   * Whether this is the full view (with header and safe area) or tab view
   */
  isFullView?: boolean;
}

const Tokens = forwardRef<TabRefreshHandle, TokensProps>(
  ({ isFullView = false }, ref) => {
    const navigation = useNavigation();
    const { trackEvent, createEventBuilder } = useAnalytics();
    const tw = useTailwind();

    // evm
    const evmNetworkConfigurationsByChainId = useSelector(
      selectEvmNetworkConfigurationsByChainId,
    );
    const currentChainId = useSelector(selectChainId);

    const [refreshing, setRefreshing] = useState(false);
    const selectedAccountId = useSelector(selectSelectedInternalAccountId);

    const selectedSolanaAccount =
      useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) ||
      null;
    const isSolanaSelected = selectedSolanaAccount !== null;

    const isHomepageRedesignV1Enabled = useSelector(
      selectHomepageRedesignV1Enabled,
    );

    const isMusdConversionFlowEnabled = useSelector(
      selectIsMusdConversionFlowEnabledFlag,
    );
    const { isEligible: isGeoEligible } = useMusdConversionEligibility();

    const [hasInitialLoad, setHasInitialLoad] = useState(false);
    const hasTrackedScreenViewRef = useRef(false);

    // Memoize selector computation for better performance
    const sortedTokenKeys = useSelector(
      selectSortedAssetsBySelectedAccountGroup,
    );

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

    useEffect(() => {
      if (!isFullView || !hasInitialLoad || hasTrackedScreenViewRef.current)
        return;
      hasTrackedScreenViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.POSITION_SCREEN_VIEWED)
          .addProperties({
            item_count: sortedTokenKeys.length,
            location: 'homepage',
            is_empty: sortedTokenKeys.length === 0,
            screen_type: 'tokens',
          })
          .build(),
      );
    }, [
      isFullView,
      hasInitialLoad,
      sortedTokenKeys.length,
      trackEvent,
      createEventBuilder,
    ]);

    const {
      removeTokenState,
      showRemoveMenu,
      removeToken,
      handleClose: handleCloseRemoveTokenBottomSheet,
      showScamWarningModal,
      setShowScamWarningModal,
    } = useRemoveToken();

    const onRefresh = useCallback(async () => {
      setRefreshing(true);

      try {
        // Wait for interactions to complete first for better performance
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            resolve();
          });
        });

        // Then await the actual refresh
        await refreshTokens({
          isSolanaSelected,
          evmNetworkConfigurationsByChainId,
          selectedAccountId,
        });
      } finally {
        setRefreshing(false);
      }
    }, [
      isSolanaSelected,
      evmNetworkConfigurationsByChainId,
      selectedAccountId,
    ]);

    useImperativeHandle(ref, () => ({
      refresh: onRefresh,
    }));

    const goToAddToken = useCallback(() => {
      goToAddEvmToken({
        navigation,
        trackEvent,
        createEventBuilder,
        getDecimalChainId,
        currentChainId,
      });
    }, [navigation, trackEvent, createEventBuilder, currentChainId]);

    const handleScamWarningModal = useCallback(() => {
      setShowScamWarningModal((prev) => !prev);
    }, [setShowScamWarningModal]);

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
            {isMusdConversionFlowEnabled && isGeoEligible && (
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
      isGeoEligible,
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
  },
);

Tokens.displayName = 'Tokens';

export default Tokens;
