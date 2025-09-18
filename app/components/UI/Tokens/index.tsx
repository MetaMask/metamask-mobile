import React, {
  useRef,
  useState,
  LegacyRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { View, InteractionManager } from 'react-native';
import ActionSheet from '@metamask/react-native-actionsheet';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
} from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import createStyles from './styles';
import { TokenList } from './TokenList';
import { TokenI } from './types';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { strings } from '../../../../locales/i18n';
import { refreshTokens, removeEvmToken, goToAddEvmToken } from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { TokenListControlBar } from './TokenListControlBar';
import { selectSelectedInternalAccountId } from '../../../selectors/accountsController';
import { ScamWarningModal } from './TokenList/ScamWarningModal';
import { selectSortedTokenKeys } from '../../../selectors/tokenList';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import Loader from '../../../component-library/components-temp/Loader';

interface TokenListNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

const Tokens = memo(() => {
  const navigation =
    useNavigation<
      StackNavigationProp<TokenListNavigationParamList, 'AddAsset'>
    >();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();

  // evm
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const currentChainId = useSelector(selectChainId);
  const nativeCurrencies = useSelector(selectNativeNetworkCurrencies);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);
  const selectedAccountId = useSelector(selectSelectedInternalAccountId);

  const [showScamWarningModal, setShowScamWarningModal] = useState(false);
  const [isTokensLoading, setIsTokensLoading] = useState(true);
  const [renderedTokenKeys, setRenderedTokenKeys] = useState<
    typeof sortedTokenKeys
  >([]);
  const [progressiveTokens, setProgressiveTokens] = useState<
    typeof sortedTokenKeys
  >([]);
  const lastTokenDataRef = useRef<typeof sortedTokenKeys>();

  const styles = useMemo(() => createStyles(colors), [colors]);

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

  // High-performance async rendering with progressive loading
  useEffect(() => {
    // Debounce rapid data changes
    if (
      JSON.stringify(sortedTokenKeys) ===
      JSON.stringify(lastTokenDataRef.current)
    ) {
      return;
    }
    lastTokenDataRef.current = sortedTokenKeys;

    if (sortedTokenKeys?.length) {
      setIsTokensLoading(true);
      setProgressiveTokens([]);

      // Use InteractionManager for better performance than setTimeout
      InteractionManager.runAfterInteractions(() => {
        const CHUNK_SIZE = 20; // Process 20 tokens at a time
        const chunks: (typeof sortedTokenKeys)[] = [];

        for (let i = 0; i < sortedTokenKeys.length; i += CHUNK_SIZE) {
          chunks.push(sortedTokenKeys.slice(i, i + CHUNK_SIZE));
        }

        // Progressive loading for better perceived performance
        let currentChunkIndex = 0;
        let accumulatedTokens: typeof sortedTokenKeys = [];

        const processChunk = () => {
          if (currentChunkIndex < chunks.length) {
            accumulatedTokens = [
              ...accumulatedTokens,
              ...chunks[currentChunkIndex],
            ];
            setProgressiveTokens([...accumulatedTokens]);
            currentChunkIndex++;

            // Process next chunk after allowing UI to update
            requestAnimationFrame(() => {
              if (currentChunkIndex < chunks.length) {
                setTimeout(processChunk, 0);
              } else {
                // All chunks processed
                setRenderedTokenKeys(accumulatedTokens);
                setIsTokensLoading(false);
              }
            });
          }
        };

        processChunk();
      });

      return;
    }

    // No tokens to render
    setRenderedTokenKeys([]);
    setProgressiveTokens([]);
    setIsTokensLoading(false);
  }, [sortedTokenKeys]);

  const showRemoveMenu = useCallback(
    (token: TokenI) => {
      // remove token currently only supported on evm
      if (isEvmSelected && actionSheet.current) {
        setTokenToRemove(token);
        actionSheet.current.show();
      }
    },
    [isEvmSelected],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Use InteractionManager for better performance during refresh
    InteractionManager.runAfterInteractions(() => {
      refreshTokens({
        isEvmSelected,
        evmNetworkConfigurationsByChainId,
        nativeCurrencies,
        selectedAccountId,
      });
      setRefreshing(false);
    });
  }, [
    isEvmSelected,
    evmNetworkConfigurationsByChainId,
    nativeCurrencies,
    selectedAccountId,
  ]);

  const removeToken = useCallback(async () => {
    // remove token currently only supported on evm
    if (isEvmSelected && tokenToRemove) {
      await removeEvmToken({
        tokenToRemove,
        currentChainId,
        trackEvent,
        strings,
        getDecimalChainId,
        createEventBuilder, // Now passed as a prop
      });
    }
  }, [
    isEvmSelected,
    tokenToRemove,
    currentChainId,
    trackEvent,
    createEventBuilder,
  ]);

  const goToAddToken = useCallback(() => {
    // add token currently only support on evm
    if (isEvmSelected) {
      goToAddEvmToken({
        navigation,
        trackEvent,
        createEventBuilder,
        getDecimalChainId,
        currentChainId,
      });
    }
  }, [
    isEvmSelected,
    navigation,
    trackEvent,
    createEventBuilder,
    currentChainId,
  ]);

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

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      {/* <AssetPollingProvider /> */}
      <TokenListControlBar goToAddToken={goToAddToken} />
      {!isTokensLoading &&
      renderedTokenKeys.length === 0 &&
      progressiveTokens.length === 0 ? (
        <View style={styles.wrapper} />
      ) : (
        <>
          {isTokensLoading && progressiveTokens.length === 0 && (
            <Loader size="large" />
          )}
          {(progressiveTokens.length > 0 || renderedTokenKeys.length > 0) && (
            <TokenList
              tokenKeys={
                isTokensLoading ? progressiveTokens : renderedTokenKeys
              }
              refreshing={refreshing}
              onRefresh={onRefresh}
              showRemoveMenu={showRemoveMenu}
              setShowScamWarningModal={handleScamWarningModal}
            />
          )}
        </>
      )}
      {showScamWarningModal && (
        <ScamWarningModal
          showScamWarningModal={showScamWarningModal}
          setShowScamWarningModal={setShowScamWarningModal}
        />
      )}
      <ActionSheet
        ref={actionSheet as LegacyRef<typeof ActionSheet>}
        title={strings('wallet.remove_token_title')}
        options={[strings('wallet.remove'), strings('wallet.cancel')]}
        cancelButtonIndex={1}
        destructiveButtonIndex={0}
        onPress={onActionSheetPress}
      />
      <ActionSheet
        ref={actionSheet as LegacyRef<typeof ActionSheet>}
        title={strings('wallet.remove_token_title')}
        options={[strings('wallet.remove'), strings('wallet.cancel')]}
        cancelButtonIndex={1}
        destructiveButtonIndex={0}
        onPress={onActionSheetPress}
      />
    </View>
  );
});

Tokens.displayName = 'Tokens';

export default Tokens;
