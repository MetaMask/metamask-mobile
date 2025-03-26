import React, {
  useRef,
  useState,
  LegacyRef,
  useMemo,
  memo,
  useCallback,
} from 'react';
import { View } from 'react-native';
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
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import {
  refreshEvmTokens,
  sortAssets,
  removeEvmToken,
  goToAddEvmToken,
} from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  selectEvmTokenFiatBalances,
  selectEvmTokens,
} from '../../../selectors/multichain';
import { TraceName, endTrace, trace } from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import { TokenListControlBar } from './TokenListControlBar';

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
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const currentChainId = useSelector(selectChainId);
  const nativeCurrencies = useSelector(selectNativeNetworkCurrencies);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const evmTokens = useSelector(selectEvmTokens);
  const tokenFiatBalances = useSelector(selectEvmTokenFiatBalances);

  const actionSheet = useRef<typeof ActionSheet>();
  const [tokenToRemove, setTokenToRemove] = useState<TokenI>();
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenEnabled, setIsAddTokenEnabled] = useState(true);

  const styles = createStyles(colors);

  const tokensList = useMemo((): TokenI[] => {
    trace({
      name: TraceName.Tokens,
      tags: getTraceTags(store.getState()),
    });

    // we need to calculate fiat balances here in order to sort by descending fiat amount
    const tokensWithBalances = evmTokens.map((token, i) => ({
      ...token,
      tokenFiatAmount: tokenFiatBalances[i],
    }));

    const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);
    endTrace({
      name: TraceName.Tokens,
    });
    return tokensSorted;
  }, [evmTokens, tokenFiatBalances, tokenSortConfig]);

  const showRemoveMenu = useCallback(
    (token: TokenI) => {
      if (actionSheet.current) {
        setTokenToRemove(token);
        actionSheet.current.show();
      }
    },
    [setTokenToRemove, actionSheet],
  );

  const onRefresh = useCallback(async () => {
    requestAnimationFrame(() => {
      setRefreshing(true);
      refreshEvmTokens({
        isEvmSelected,
        evmNetworkConfigurationsByChainId,
        nativeCurrencies,
      });
      setRefreshing(false);
    });
  }, [
    isEvmSelected,
    setRefreshing,
    evmNetworkConfigurationsByChainId,
    nativeCurrencies,
  ]);

  const removeToken = useCallback(async () => {
    if (tokenToRemove) {
      await removeEvmToken({
        tokenToRemove,
        currentChainId,
        trackEvent,
        strings,
        getDecimalChainId,
        createEventBuilder, // Now passed as a prop
      });
    }
  }, [tokenToRemove, currentChainId, trackEvent, createEventBuilder]);

  const goToAddToken = useCallback(() => {
    goToAddEvmToken({
      setIsAddTokenEnabled,
      navigation,
      trackEvent,
      createEventBuilder,
      getDecimalChainId,
      currentChainId,
    });
  }, [
    setIsAddTokenEnabled,
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

  return (
    <AssetPollingProvider>
      <View
        style={styles.wrapper}
        testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
      >
        <TokenListControlBar goToAddToken={goToAddToken} />
        {tokensList && (
          <TokenList
            tokens={tokensList}
            refreshing={refreshing}
            isAddTokenEnabled={isAddTokenEnabled}
            onRefresh={onRefresh}
            showRemoveMenu={showRemoveMenu}
            goToAddToken={goToAddToken}
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
      </View>
    </AssetPollingProvider>
  );
});

export default React.memo(Tokens);
