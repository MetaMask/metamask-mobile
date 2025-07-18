import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome5';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import { isValidAddress } from 'ethereumjs-util';

import Device from '../../../../util/device';
import { addCurrencySymbol } from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import { fontStyles } from '../../../../styles/common';

import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import TokenIcon from './TokenIcon';
import Alert from '../../../Base/Alert';
import useBlockExplorer from '../utils/useBlockExplorer';
import useFetchTokenMetadata from '../utils/useFetchTokenMetadata';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import TokenImportModal from './TokenImportModal';

import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectAccounts } from '../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { useMetrics } from '../../../../components/hooks/useMetrics';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useTheme } from '../../../../util/theme';
import { QuoteViewSelectorIDs } from '../../../../../e2e/selectors/swaps/QuoteView.selectors';
import { getDecimalChainId } from '../../../../util/networks';
import { getSortedTokensByFiatValue } from '../utils/token-list-utils';

const createStyles = (colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    modalView: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 30,
      marginVertical: 10,
      paddingVertical: Device.isAndroid() ? 0 : 10,
      paddingHorizontal: 5,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    searchIcon: {
      marginHorizontal: 8,
      color: colors.icon.alternative,
    },
    input: {
      ...fontStyles.normal,
      flex: 1,
      color: colors.text.default,
    },
    modalTitle: {
      marginTop: Device.isIphone5() ? 10 : 15,
      marginBottom: Device.isIphone5() ? 5 : 5,
    },
    resultsView: {
      height: Device.isSmallDevice() ? 200 : 280,
      marginTop: 10,
    },
    resultRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
    emptyList: {
      marginVertical: 10,
      marginHorizontal: 30,
    },
    importButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.primary.default,
      borderRadius: 100,
    },
    importButtonText: {
      color: colors.primary.inverse,
    },
    loadingIndicator: {
      margin: 10,
    },
    loadingTokenView: {
      marginVertical: 10,
      marginHorizontal: 30,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    footer: {
      padding: 30,
    },
    footerIcon: {
      paddingTop: 4,
      paddingRight: 8,
    },
  });

const MAX_TOKENS_RESULTS = 20;

function TokenSelectModal({
  isVisible,
  dismiss,
  title,
  tokens,
  initialTokens,
  onItemPress,
  excludeAddresses = [],
  accounts,
  selectedAddress,
  currentCurrency,
  conversionRate,
  tokenExchangeRates,
  chainId,
  networkConfigurations,
  balances,
}) {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const searchInput = useRef(null);
  const list = useRef();
  const [searchString, setSearchString] = useState('');
  const explorer = useBlockExplorer(networkConfigurations);
  const [isTokenImportVisible, , showTokenImportModal, hideTokenImportModal] =
    useModalHandler(false);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const excludedAddresses = useMemo(
    () =>
      excludeAddresses.filter(Boolean).map((address) => address.toLowerCase()),
    [excludeAddresses],
  );

  const filteredTokens = useMemo(
    () =>
      tokens?.filter(
        (token) => !excludedAddresses.includes(token.address?.toLowerCase()),
      ),
    [tokens, excludedAddresses],
  );

  const sortedInitialTokensWithFiatValue = useMemo(
    () =>
      getSortedTokensByFiatValue({
        tokens: initialTokens,
        account: accounts[selectedAddress],
        tokenExchangeRates,
        balances,
        conversionRate,
        currencyCode: currentCurrency,
      }),
    [
      initialTokens,
      accounts,
      selectedAddress,
      tokenExchangeRates,
      balances,
      conversionRate,
      currentCurrency,
    ],
  );

  const filteredInitialTokens = useMemo(
    () =>
      sortedInitialTokensWithFiatValue?.length > 0
        ? sortedInitialTokensWithFiatValue.filter(
            (token) =>
              typeof token !== 'undefined' &&
              !excludedAddresses.includes(token?.address?.toLowerCase()),
          )
        : filteredTokens,
    [excludedAddresses, filteredTokens, sortedInitialTokensWithFiatValue],
  );

  const tokenFuse = useMemo(
    () =>
      new Fuse(filteredTokens, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'address', 'name'],
      }),
    [filteredTokens],
  );
  const tokenSearchResults = useMemo(
    () =>
      searchString.length > 0
        ? tokenFuse.search(searchString)?.slice(0, MAX_TOKENS_RESULTS)
        : filteredInitialTokens,
    [searchString, tokenFuse, filteredInitialTokens],
  );

  const shouldFetchToken = useMemo(
    () =>
      tokenSearchResults.length === 0 &&
      isValidAddress(searchString) &&
      !excludedAddresses.includes(searchString?.toLowerCase()),
    [excludedAddresses, searchString, tokenSearchResults.length],
  );

  const [loadingTokenMetadata, tokenMetadata] = useFetchTokenMetadata(
    shouldFetchToken ? searchString : null,
    chainId,
  );

  const renderItem = useCallback(
    ({ item }) => {
      const { balance, balanceFiat } = item;
      const balanceFiatWithCurrencySymbol = balanceFiat
        ? addCurrencySymbol(balanceFiat, currentCurrency)
        : undefined;

      return (
        <TouchableOpacity
          style={styles.resultRow}
          onPress={() => onItemPress(item)}
        >
          <ListItem>
            <ListItem.Content>
              <ListItem.Icon>
                <TokenIcon medium icon={item.iconUrl} symbol={item.symbol} />
              </ListItem.Icon>
              <ListItem.Body>
                <ListItem.Title>{item.symbol}</ListItem.Title>
                {item.name && <Text>{item.name}</Text>}
              </ListItem.Body>
              <ListItem.Amounts>
                <ListItem.Amount>{balance}</ListItem.Amount>
                {balanceFiat && balanceFiatWithCurrencySymbol && (
                  <ListItem.FiatAmount>
                    {balanceFiatWithCurrencySymbol}
                  </ListItem.FiatAmount>
                )}
              </ListItem.Amounts>
            </ListItem.Content>
          </ListItem>
        </TouchableOpacity>
      );
    },
    [currentCurrency, onItemPress, styles],
  );

  const handleSearchPress = () => searchInput?.current?.focus();

  const handleShowImportToken = useCallback(() => {
    searchInput?.current?.blur();
    showTokenImportModal();
  }, [showTokenImportModal]);

  const handlePressImportToken = useCallback(
    (item) => {
      const { address, symbol } = item;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CUSTOM_TOKEN_IMPORTED)
          .addSensitiveProperties({
            address,
            symbol,
            chain_id: getDecimalChainId(chainId),
          })
          .build(),
      );
      hideTokenImportModal();
      onItemPress(item);
    },
    [
      chainId,
      hideTokenImportModal,
      onItemPress,
      trackEvent,
      createEventBuilder,
    ],
  );

  const handleBlockExplorerPress = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: shouldFetchToken
          ? explorer.token(searchString)
          : explorer.token('').replace('token/', 'tokens/'),
        title: strings(
          shouldFetchToken ? 'swaps.verify' : 'swaps.find_token_address',
        ),
      },
    });
    dismiss();
  }, [dismiss, explorer, navigation, searchString, shouldFetchToken]);

  const renderFooter = useMemo(
    () => (
      <TouchableWithoutFeedback>
        <Alert
          renderIcon={() => (
            <FAIcon
              name="info-circle"
              style={styles.footerIcon}
              color={colors.primary.default}
              size={15}
            />
          )}
        >
          {(textStyle) => (
            <Text style={textStyle}>
              <Text reset bold>
                {strings('swaps.cant_find_token')}
              </Text>
              {` ${strings('swaps.manually_pasting')}`}
              {explorer.isValid && (
                <Text reset>
                  {` ${strings('swaps.token_address_can_be_found')} `}
                  <Text reset link underline onPress={handleBlockExplorerPress}>
                    {explorer.name}
                  </Text>
                  .
                </Text>
              )}
            </Text>
          )}
        </Alert>
      </TouchableWithoutFeedback>
    ),
    [explorer.isValid, explorer.name, handleBlockExplorerPress, styles, colors],
  );

  const renderEmptyList = useMemo(
    () => (
      <View style={styles.emptyList}>
        <Text>{strings('swaps.no_tokens_result', { searchString })}</Text>
      </View>
    ),
    [searchString, styles],
  );

  const handleSearchTextChange = useCallback((text) => {
    setSearchString(text);
    if (list.current) list.current.scrollToOffset({ animated: false, y: 0 });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchString('');
    searchInput?.current?.focus();
  }, [setSearchString]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      onSwipeComplete={dismiss}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      onModalHide={() => setSearchString('')}
      style={styles.modal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <SafeAreaView style={styles.modalView}>
        <ModalDragger />
        <Text bold centered primary style={styles.modalTitle}>
          {title}
        </Text>
        <TouchableWithoutFeedback onPress={handleSearchPress}>
          <View style={styles.inputWrapper}>
            <Icon name="search" size={20} style={styles.searchIcon} />
            <TextInput
              ref={searchInput}
              style={styles.input}
              placeholder={strings('swaps.search_token')}
              placeholderTextColor={colors.text.muted}
              value={searchString}
              onChangeText={handleSearchTextChange}
              keyboardAppearance={themeAppearance}
              testID={QuoteViewSelectorIDs.SEARCH_TOKEN}
            />
            {searchString.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Icon name="close-circle" size={20} style={styles.searchIcon} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>
        {shouldFetchToken ? (
          <View style={styles.resultsView}>
            {loadingTokenMetadata ? (
              <View style={styles.loadingTokenView}>
                <ActivityIndicator style={styles.loadingIndicator} />
                <Text>{strings('swaps.gathering_token_details')}</Text>
              </View>
            ) : tokenMetadata.error ? (
              <View style={styles.emptyList}>
                <Text>{strings('swaps.error_gathering_token_details')}</Text>
              </View>
            ) : tokenMetadata.valid ? (
              <View style={styles.resultRow}>
                <ListItem>
                  <ListItem.Content>
                    <ListItem.Icon>
                      <TokenIcon
                        medium
                        icon={tokenMetadata.metadata.iconUrl}
                        symbol={tokenMetadata.metadata.symbol}
                      />
                    </ListItem.Icon>
                    <ListItem.Body>
                      <ListItem.Title>
                        {tokenMetadata.metadata.symbol}
                      </ListItem.Title>
                      {tokenMetadata.metadata.name && (
                        <Text>{tokenMetadata.metadata.name}</Text>
                      )}
                    </ListItem.Body>
                    <ListItem.Amounts>
                      <TouchableOpacity
                        style={styles.importButton}
                        onPress={handleShowImportToken}
                      >
                        <Text small style={styles.importButtonText}>
                          {strings('swaps.Import')}
                        </Text>
                      </TouchableOpacity>
                    </ListItem.Amounts>
                  </ListItem.Content>
                </ListItem>
                <TokenImportModal
                  isVisible={isTokenImportVisible}
                  dismiss={hideTokenImportModal}
                  token={tokenMetadata.metadata}
                  onPressImport={() =>
                    handlePressImportToken(tokenMetadata.metadata)
                  }
                />
              </View>
            ) : (
              <View style={styles.emptyList}>
                <Text>
                  {strings('swaps.invalid_token_contract_address')}
                  {explorer.isValid && (
                    <Text reset>
                      {` ${strings('swaps.please_verify_on_explorer')} `}
                      <Text
                        reset
                        link
                        underline
                        onPress={handleBlockExplorerPress}
                      >
                        {explorer.name}
                      </Text>
                      .
                    </Text>
                  )}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            ref={list}
            style={styles.resultsView}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
            data={tokenSearchResults}
            renderItem={renderItem}
            keyExtractor={(item) => item.address}
            ListEmptyComponent={renderEmptyList}
            ListFooterComponent={renderFooter}
            ListFooterComponentStyle={[styles.resultRow, styles.footer]}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

TokenSelectModal.propTypes = {
  isVisible: PropTypes.bool,
  dismiss: PropTypes.func,
  title: PropTypes.string,
  tokens: PropTypes.arrayOf(PropTypes.object),
  initialTokens: PropTypes.arrayOf(PropTypes.object),
  onItemPress: PropTypes.func,
  excludeAddresses: PropTypes.arrayOf(PropTypes.string),
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Map of accounts to information objects including balances
   */
  accounts: PropTypes.object,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * A string that represents the selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * An object containing token balances for current account and network in the format address => balance
   */
  balances: PropTypes.object,
  /**
   * An object containing token exchange rates in the format address => exchangeRate
   */
  tokenExchangeRates: PropTypes.object,
  /**
   * Chain Id
   */
  chainId: PropTypes.string,
  /**
   * Network configurations
   */
  networkConfigurations: PropTypes.object,
};

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  tokenExchangeRates: selectContractExchangeRates(state),
  balances: selectContractBalances(state),
  chainId: selectEvmChainId(state),
  networkConfigurations: selectEvmNetworkConfigurationsByChainId(state),
});

export default connect(mapStateToProps)(TokenSelectModal);
