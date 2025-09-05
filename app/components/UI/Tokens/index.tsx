import React, { useRef, useState, LegacyRef, memo, useCallback } from 'react';
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
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';

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

  const styles = createStyles(colors);

  // BIP44 MAINTENANCE: Once stable, only use selectSortedAssetsBySelectedAccountGroup
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const sortedTokenKeys = useSelector(
    isMultichainAccountsState2Enabled
      ? selectSortedAssetsBySelectedAccountGroup
      : selectSortedTokenKeys,
  );

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

  const handleScamWarningModal = () => {
    setShowScamWarningModal(!showScamWarningModal);
  };

  return (
    <View
      style={styles.wrapper}
      testID={WalletViewSelectorsIDs.TOKENS_CONTAINER}
    >
      <AssetPollingProvider />
      <TokenListControlBar goToAddToken={goToAddToken} />
      {sortedTokenKeys && (
        <TokenList
          tokenKeys={sortedTokenKeys}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showRemoveMenu={showRemoveMenu}
          setShowScamWarningModal={handleScamWarningModal}
        />
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
