import React, {
  useRef,
  useState,
  LegacyRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { InteractionManager, View } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
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
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import {
  refreshTokens,
  removeEvmToken,
  removeNonEvmToken,
  goToAddEvmToken,
} from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Box } from '@metamask/design-system-react-native';
import { TokenListControlBar } from './TokenListControlBar/TokenListControlBar';
import { selectSelectedInternalAccountId } from '../../../selectors/accountsController';
import { ScamWarningModal } from './TokenList/ScamWarningModal/ScamWarningModal';
import TokenListSkeleton from './TokenList/TokenListSkeleton/TokenListSkeleton';
import { selectSortedTokenKeys } from '../../../selectors/tokenList';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { SolScope } from '@metamask/keyring-api';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
import { TokensEmptyState } from '../TokensEmptyState';
import MusdConversionAssetListCta from '../Earn/components/Musd/MusdConversionAssetListCta';
import { selectIsMusdConversionFlowEnabledFlag } from '../Earn/selectors/featureFlags';

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

  const actionSheet = useRef<typeof ActionSheet>();
  const tokenToRemoveRef = useRef<TokenI | undefined>();
  const [refreshing, setRefreshing] = useState(false);
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

  // BIP44 MAINTENANCE: Once stable, only use selectSortedAssetsBySelectedAccountGroup
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // Memoize selector computation for better performance
  const sortedTokenKeys = useSelector(
    useMemo(
      () =>
        isMultichainAccountsState2Enabled
          ? selectSortedAssetsBySelectedAccountGroup
          : selectSortedTokenKeys,
      [isMultichainAccountsState2Enabled],
    ),
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
    if (actionSheet.current) {
      tokenToRemoveRef.current = token;
      actionSheet.current.show();
    }
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
    const tokenToRemove = tokenToRemoveRef.current;
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

  const onActionSheetPress = useCallback(
    (index: number) => {
      if (index === 0) {
        removeToken();
      }
    },
    [removeToken],
  );

  const handleScamWarningModal = useCallback(() => {
    setShowScamWarningModal((prev) => !prev);
  }, []);

  const maxItems = useMemo(() => {
    if (isFullView) {
      return undefined;
    }
    return isHomepageRedesignV1Enabled ? 10 : undefined;
  }, [isFullView, isHomepageRedesignV1Enabled]);

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
      {!hasInitialLoad ? (
        <Box twClassName={isFullView ? 'px-4' : undefined}>
          <TokenListSkeleton />
        </Box>
      ) : sortedTokenKeys.length > 0 ? (
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
      ) : (
        <Box twClassName={isFullView ? 'px-4 items-center' : 'items-center'}>
          <TokensEmptyState />
        </Box>
      )}
      <ScamWarningModal
        showScamWarningModal={showScamWarningModal}
        setShowScamWarningModal={setShowScamWarningModal}
      />
      <ActionSheet
        ref={actionSheet as LegacyRef<typeof ActionSheet>}
        title={strings('wallet.remove_token_title')}
        options={[strings('wallet.remove'), strings('wallet.cancel')]}
        cancelButtonIndex={1}
        destructiveButtonIndex={0}
        onPress={onActionSheetPress}
      />
    </Box>
  );
});

Tokens.displayName = 'Tokens';

export default Tokens;
