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
  refreshTokens,
  sortAssets,
  removeEvmToken,
  goToAddEvmToken,
} from './util';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  selectEvmTokenFiatBalances,
  selectEvmTokens,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectMultichainTokenListForAccountId,
  ///: END:ONLY_INCLUDE_IF
} from '../../../selectors/multichain';
import { TraceName, endTrace, trace } from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import { TokenListControlBar } from './TokenListControlBar';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { RootState } from '../../../reducers';
///: END:ONLY_INCLUDE_IF

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

  // evm
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
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  // non-evm
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
 const nonEvmTokens = useSelector((state: RootState) =>
  selectMultichainTokenListForAccountId(state, selectedAccount?.id),
);
  ///: END:ONLY_INCLUDE_IF


  const tokenListData = isEvmSelected ? evmTokens : nonEvmTokens;

  const styles = createStyles(colors);

  // we need to calculate fiat balances here in order to sort by descending fiat amount
  const tokensWithBalances = useMemo(
    () =>
      tokenListData.map((token, i) => ({
        ...token,
        tokenFiatAmount: isEvmSelected
          ? tokenFiatBalances[i]
          : token.balanceFiat,
      })),
    [tokenListData, tokenFiatBalances, isEvmSelected],
  );

  const tokensList = useMemo((): TokenI[] => {
    trace({
      name: TraceName.Tokens,
      tags: getTraceTags(store.getState()),
    });

    const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);
    endTrace({
      name: TraceName.Tokens,
    });
    return tokensSorted;
  }, [tokenSortConfig, tokensWithBalances]);

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
    requestAnimationFrame(() => {
      setRefreshing(true);
      refreshTokens({
        isEvmSelected,
        evmNetworkConfigurationsByChainId,
        nativeCurrencies,
        selectedAccount,
      });
      setRefreshing(false);
    });
  }, [
    isEvmSelected,
    evmNetworkConfigurationsByChainId,
    nativeCurrencies,
    selectedAccount,
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
        setIsAddTokenEnabled,
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
