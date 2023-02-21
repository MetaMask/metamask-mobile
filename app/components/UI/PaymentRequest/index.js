import React, { PureComponent } from 'react';
import {
  SafeAreaView,
  TextInput,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  InteractionManager,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import { fontStyles, baseStyles } from '../../../styles/common';
import { getPaymentRequestOptionsTitle } from '../../UI/Navbar';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Fuse from 'fuse.js';
import AssetList from './AssetList';
import PropTypes from 'prop-types';
import {
  weiToFiat,
  toWei,
  balanceToFiat,
  renderFromWei,
  fiatNumberToWei,
  fromWei,
  isDecimal,
  fiatNumberToTokenMinimalUnit,
  renderFromTokenMinimalUnit,
  fromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../StyledButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  generateETHLink,
  generateERC20Link,
  generateUniversalLinkRequest,
} from '../../../util/payment-link-generator';
import Device from '../../../util/device';
import currencySymbols from '../../../util/currency-symbols.json';
import { NetworksChainId } from '@metamask/controller-utils';
import { getTicker } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';
import { getTokenListArray } from '../../../reducers/tokens';
import { utils as ethersUtils } from 'ethers';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { isTestNet } from '../../../util/networks';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers/dist/assetsUtil';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  REQUEST_AMOUNT_INPUT,
  REQUEST_SEARCH_ASSET_INPUT,
  REQUEST_SEARCH_SCREEN,
} from '../../../../wdio/screen-objects/testIDs/Screens/RequestToken.testIds';

const KEYBOARD_OFFSET = 120;
const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    title: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
    amountWrapper: {
      marginVertical: 8,
    },
    searchWrapper: {
      marginVertical: 8,
      borderColor: colors.border.default,
      borderWidth: 1,
      borderRadius: 8,
      flexDirection: 'row',
      backgroundColor: colors.background.default,
    },
    searchInput: {
      paddingTop: Device.isAndroid() ? 12 : 0,
      paddingLeft: 8,
      fontSize: 16,
      height: 40,
      flex: 1,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    searchIcon: {
      textAlignVertical: 'center',
      marginLeft: 12,
      alignSelf: 'center',
    },
    clearButton: { paddingHorizontal: 12, justifyContent: 'center' },
    input: {
      ...fontStyles.normal,
      backgroundColor: colors.background.default,
      borderWidth: 0,
      fontSize: 24,
      paddingBottom: 0,
      paddingRight: 0,
      paddingLeft: 0,
      paddingTop: 0,
      color: colors.text.default,
    },
    eth: {
      ...fontStyles.normal,
      fontSize: 24,
      paddingTop: Device.isAndroid() ? 3 : 0,
      paddingLeft: 10,
      textTransform: 'uppercase',
      color: colors.text.default,
    },
    testNetEth: {
      ...fontStyles.normal,
      fontSize: 24,
      paddingTop: Device.isAndroid() ? 3 : 0,
      paddingLeft: 10,
      color: colors.text.default,
    },
    fiatValue: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.text.default,
    },
    split: {
      flex: 1,
      flexDirection: 'row',
    },
    ethContainer: {
      flex: 1,
      flexDirection: 'row',
      paddingLeft: 6,
      paddingRight: 10,
    },
    container: {
      flex: 1,
      flexDirection: 'row',
      paddingRight: 10,
      paddingVertical: 10,
      paddingLeft: 14,
      position: 'relative',
      backgroundColor: colors.background.default,
      borderColor: colors.border.default,
      borderRadius: 4,
      borderWidth: 1,
    },
    amounts: {
      maxWidth: '70%',
    },
    switchContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'center',
      right: 0,
    },
    switchTouchable: {
      flexDirection: 'row',
      alignSelf: 'flex-end',
      right: 0,
    },
    enterAmountWrapper: {
      flex: 1,
      flexDirection: 'column',
    },
    button: {
      marginBottom: 16,
    },
    buttonsWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'flex-end',
    },
    scrollViewContainer: {
      padding: 24,
    },
    errorWrapper: {
      backgroundColor: colors.error.muted,
      borderRadius: 4,
      marginTop: 8,
    },
    errorText: {
      color: colors.text.default,
      alignSelf: 'center',
    },
    assetsWrapper: {
      marginTop: 16,
    },
    assetsTitle: {
      ...fontStyles.normal,
      fontSize: 16,
      marginBottom: 8,
      color: colors.text.default,
    },
    secondaryAmount: {
      flexDirection: 'row',
    },
    currencySymbol: {
      ...fontStyles.normal,
      fontSize: 24,
      color: colors.text.default,
    },
    currencySymbolSmall: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.text.default,
    },
  });

const fuse = new Fuse([], {
  shouldSort: true,
  threshold: 0.45,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'symbol', weight: 0.5 },
  ],
});

const defaultEth = {
  symbol: 'ETH',
  name: 'Ether',
  isETH: true,
};
const defaultAssets = [
  defaultEth,
  {
    address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
    decimals: 18,
    erc20: true,
    logo: 'sai.svg',
    name: 'Sai Stablecoin v1.0',
    symbol: 'SAI',
  },
];

const MODE_SELECT = 'select';
const MODE_AMOUNT = 'amount';

/**
 * View to generate a payment request link
 */
class PaymentRequest extends PureComponent {
  static propTypes = {
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * ETH-to-current currency conversion rate from CurrencyRateController
     */
    conversionRate: PropTypes.number,
    /**
     * Currency code for currently-selected currency from CurrencyRateController
     */
    currentCurrency: PropTypes.string,
    /**
     * Object containing token exchange rates in the format address => exchangeRate
     */
    contractExchangeRates: PropTypes.object,
    /**
     * Primary currency, either ETH or Fiat
     */
    primaryCurrency: PropTypes.string,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * Array of ERC20 assets
     */
    tokens: PropTypes.array,
    /**
     * A string representing the chainId
     */
    chainId: PropTypes.string,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * List of tokens from TokenListController (Formatted into array)
     */
    tokenList: PropTypes.array,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  amountInput = React.createRef();
  searchInput = React.createRef();

  state = {
    searchInputValue: '',
    results: [],
    selectedAsset: undefined,
    mode: MODE_SELECT,
    internalPrimaryCurrency: '',
    cryptoAmount: undefined,
    amount: undefined,
    secondaryAmount: undefined,
    symbol: undefined,
    showError: false,
    inputWidth: { width: '99%' },
  };

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getPaymentRequestOptionsTitle(
        strings('payment_request.title'),
        navigation,
        route,
        colors,
      ),
    );
  };

  /**
   * Set chainId, internalPrimaryCurrency and receiveAssets, if there is an asset set to this payment request chose it automatically, to state
   */
  componentDidMount = () => {
    const { primaryCurrency, route, tokenList } = this.props;
    this.updateNavBar();
    const receiveAsset = route?.params?.receiveAsset;
    this.setState({
      internalPrimaryCurrency: primaryCurrency,
      inputWidth: { width: '100%' },
    });
    if (receiveAsset) {
      this.goToAmountInput(receiveAsset);
    }
    // TODO: Fuse will only be updated once on mount. When we convert this component to hooks, we can utilize useEffect to update fuse.
    // Update fuse collection with token list
    fuse.setCollection(tokenList);
  };

  componentDidUpdate = () => {
    this.updateNavBar();
    InteractionManager.runAfterInteractions(() => {
      this.amountInput.current && this.amountInput.current.focus();
    });
  };

  /**
   * Go to asset selection view and modify navbar accordingly
   */
  goToAssetSelection = () => {
    const { navigation } = this.props;
    navigation &&
      navigation.setParams({ mode: MODE_SELECT, dispatch: undefined });
    this.setState({
      mode: MODE_SELECT,
      amount: undefined,
      cryptoAmount: undefined,
      secondaryAmount: undefined,
      symbol: undefined,
    });
  };

  /**
   * Go to enter amount view, with selectedAsset and modify navbar accordingly
   *
   * @param {object} selectedAsset - Asset selected to build the payment request
   */
  goToAmountInput = async (selectedAsset) => {
    const { navigation } = this.props;
    navigation &&
      navigation.setParams({
        mode: MODE_AMOUNT,
        dispatch: this.goToAssetSelection,
      });
    await this.setState({ selectedAsset, mode: MODE_AMOUNT });
    this.updateAmount();
  };

  /**
   * Handle search input result
   *
   * @param {string} searchInputValue - String containing assets query
   */
  handleSearch = (searchInputValue) => {
    const { tokenList } = this.props;
    if (typeof searchInputValue !== 'string') {
      searchInputValue = this.state.searchInputValue;
    }

    const fuseSearchResult = fuse.search(searchInputValue);
    const addressSearchResult = tokenList.filter((token) =>
      toLowerCaseEquals(token.address, searchInputValue),
    );
    const results = [...addressSearchResult, ...fuseSearchResult];
    this.setState({ searchInputValue, results });
  };

  /** Clear search input and focus */
  clearSearchInput = () => {
    this.setState({ searchInputValue: '' });
    this.searchInput.current?.focus?.();
  };

  /**
   * Renders a view that allows user to select assets to build the payment request
   * Either top picks and user's assets are available to select
   */
  renderSelectAssets = () => {
    const { tokens, chainId, ticker, tokenList } = this.props;
    const { inputWidth } = this.state;
    let results;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);
    const isTDSupportedForNetwork =
      isTokenDetectionSupportedForNetwork(chainId);

    if (isTDSupportedForNetwork) {
      const defaults =
        chainId === NetworksChainId.mainnet
          ? defaultAssets
          : [{ ...defaultEth, symbol: getTicker(ticker), name: '' }];
      results = this.state.searchInputValue ? this.state.results : defaults;
    } else if (
      //Check to see if it is not a test net ticker symbol
      Object.values(NetworksChainId).find((value) => value === chainId) &&
      !(parseInt(chainId, 10) > 1 && parseInt(chainId, 10) < 6)
    ) {
      results = [defaultEth];
    } else {
      results = [{ ...defaultEth, symbol: getTicker(ticker), name: '' }];
    }

    const userTokens = tokens.map((token) => {
      const contract = tokenList.find(
        (contractToken) => contractToken.address === token.address,
      );
      if (contract) return contract;
      return token;
    });
    return (
      <View
        style={baseStyles.flexGrow}
        {...generateTestId(Platform, REQUEST_SEARCH_SCREEN)}
      >
        <View>
          <Text style={styles.title}>
            {strings('payment_request.choose_asset')}
          </Text>
        </View>
        {isTDSupportedForNetwork && (
          <View style={styles.searchWrapper}>
            <FeatherIcon
              name="search"
              size={18}
              color={colors.icon.muted}
              style={styles.searchIcon}
            />
            <TextInput
              ref={this.searchInput}
              style={[styles.searchInput, inputWidth]}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={this.handleSearch}
              onSubmitEditing={this.handleSearch}
              placeholder={strings('payment_request.search_assets')}
              placeholderTextColor={colors.text.muted}
              returnKeyType="go"
              value={this.state.searchInputValue}
              blurOnSubmit
              {...generateTestId(Platform, REQUEST_SEARCH_ASSET_INPUT)}
              keyboardAppearance={themeAppearance}
            />
            {this.state.searchInputValue ? (
              <TouchableOpacity
                onPress={this.clearSearchInput}
                style={styles.clearButton}
              >
                <FontAwesome
                  name="times-circle"
                  size={18}
                  color={colors.icon.default}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        <View style={styles.assetsWrapper} testID={'searched-asset-results'}>
          <Text style={styles.assetsTitle}>
            {this.state.searchInputValue
              ? strings('payment_request.search_results')
              : strings('payment_request.search_top_picks')}
          </Text>
          <AssetList
            searchResults={results}
            handleSelectAsset={this.goToAmountInput}
            selectedAsset={this.state.selectedAsset}
            searchQuery={this.state.searchInputValue}
            emptyMessage={strings('payment_request.search_no_tokens_found')}
          />
        </View>
        {userTokens.length > 0 && (
          <View style={styles.assetsWrapper}>
            <Text style={styles.assetsTitle}>
              {strings('payment_request.your_tokens')}
            </Text>
            <AssetList
              searchResults={userTokens}
              handleSelectAsset={this.goToAmountInput}
              selectedAsset={this.state.selectedAsset}
              searchQuery={this.state.searchInputValue}
            />
          </View>
        )}
      </View>
    );
  };

  /**
   * Handles payment request parameters for ETH as primaryCurrency
   *
   * @param {string} amount - String containing amount number from input, as token value
   * @returns {object} - Object containing respective symbol, secondaryAmount and cryptoAmount according to amount and selectedAsset
   */
  handleETHPrimaryCurrency = (amount) => {
    const { conversionRate, currentCurrency, contractExchangeRates } =
      this.props;
    const { selectedAsset } = this.state;
    let secondaryAmount;
    const symbol = selectedAsset.symbol;
    const undefAmount =
      isDecimal(amount) && !ethersUtils.isHexString(amount) ? amount : 0;
    const cryptoAmount = amount;
    const exchangeRate =
      selectedAsset &&
      selectedAsset.address &&
      contractExchangeRates[selectedAsset.address];
    if (selectedAsset.symbol !== 'ETH') {
      secondaryAmount = exchangeRate
        ? balanceToFiat(
            undefAmount,
            conversionRate,
            exchangeRate,
            currentCurrency,
          )
        : undefined;
    } else {
      secondaryAmount = weiToFiat(
        toWei(undefAmount),
        conversionRate,
        currentCurrency,
      );
    }
    return { symbol, secondaryAmount, cryptoAmount };
  };

  /**
   * Handles payment request parameters for Fiat as primaryCurrency
   *
   * @param {string} amount - String containing amount number from input, as fiat value
   * @returns {object} - Object containing respective symbol, secondaryAmount and cryptoAmount according to amount and selectedAsset
   */
  handleFiatPrimaryCurrency = (amount) => {
    const { conversionRate, currentCurrency, contractExchangeRates } =
      this.props;
    const { selectedAsset } = this.state;
    const symbol = currentCurrency;
    const exchangeRate =
      selectedAsset &&
      selectedAsset.address &&
      contractExchangeRates[selectedAsset.address];
    const undefAmount = (isDecimal(amount) && amount) || 0;
    let secondaryAmount, cryptoAmount;
    if (selectedAsset.symbol !== 'ETH' && exchangeRate && exchangeRate !== 0) {
      const secondaryMinimalUnit = fiatNumberToTokenMinimalUnit(
        undefAmount,
        conversionRate,
        exchangeRate,
        selectedAsset.decimals,
      );
      secondaryAmount =
        renderFromTokenMinimalUnit(
          secondaryMinimalUnit,
          selectedAsset.decimals,
        ) +
        ' ' +
        selectedAsset.symbol;
      cryptoAmount = fromTokenMinimalUnit(
        secondaryMinimalUnit,
        selectedAsset.decimals,
      );
    } else {
      secondaryAmount =
        renderFromWei(fiatNumberToWei(undefAmount, conversionRate)) +
        ' ' +
        strings('unit.eth');
      cryptoAmount = fromWei(fiatNumberToWei(undefAmount, conversionRate));
    }
    return { symbol, secondaryAmount, cryptoAmount };
  };

  /**
   * Handles amount update, setting amount related state parameters, it handles state according to internalPrimaryCurrency
   *
   * @param {string} amount - String containing amount number from input
   */
  updateAmount = (amount) => {
    const { internalPrimaryCurrency, selectedAsset } = this.state;
    const { conversionRate, contractExchangeRates, currentCurrency } =
      this.props;
    const currencySymbol = currencySymbols[currentCurrency];
    const exchangeRate =
      selectedAsset &&
      selectedAsset.address &&
      contractExchangeRates[selectedAsset.address];
    let res;
    // If primary currency is not crypo we need to know if there are conversion and exchange rates to handle0,
    // fiat conversion for the payment request
    if (
      internalPrimaryCurrency !== 'ETH' &&
      conversionRate &&
      (exchangeRate || selectedAsset.isETH)
    ) {
      res = this.handleFiatPrimaryCurrency(amount?.replace(',', '.'));
    } else {
      res = this.handleETHPrimaryCurrency(amount?.replace(',', '.'));
    }
    const { cryptoAmount, symbol } = res;
    if (amount && amount[0] === currencySymbol) amount = amount.substr(1);
    if (res.secondaryAmount && res.secondaryAmount[0] === currencySymbol)
      res.secondaryAmount = res.secondaryAmount.substr(1);
    if (amount && amount === '0') amount = undefined;
    this.setState({
      amount,
      cryptoAmount,
      secondaryAmount: res.secondaryAmount,
      symbol,
      showError: false,
    });
  };

  /**
   * Updates internalPrimaryCurrency
   */
  switchPrimaryCurrency = async () => {
    const { internalPrimaryCurrency, secondaryAmount } = this.state;
    const primarycurrencies = {
      ETH: 'Fiat',
      Fiat: 'ETH',
    };
    await this.setState({
      internalPrimaryCurrency: primarycurrencies[internalPrimaryCurrency],
    });
    this.updateAmount(secondaryAmount.split(' ')[0]);
  };

  /**
   * Resets amount on payment request
   */
  onReset = () => {
    this.updateAmount();
  };

  /**
   * Generates payment request link and redirects to PaymentRequestSuccess view with it
   * If there is an error, an error message will be set to display on the view
   */
  onNext = () => {
    const { selectedAddress, navigation, chainId } = this.props;
    const { cryptoAmount, selectedAsset } = this.state;

    try {
      if (cryptoAmount && cryptoAmount > '0') {
        let eth_link;
        if (selectedAsset.isETH) {
          const amount = toWei(cryptoAmount).toString();
          eth_link = generateETHLink(selectedAddress, amount, chainId);
        } else {
          const amount = toTokenMinimalUnit(
            cryptoAmount,
            selectedAsset.decimals,
          ).toString();
          eth_link = generateERC20Link(
            selectedAddress,
            selectedAsset.address,
            amount,
            chainId,
          );
        }

        // Convert to universal link / app link
        const link = generateUniversalLinkRequest(eth_link);

        navigation &&
          navigation.replace('PaymentRequestSuccess', {
            link,
            qrLink: eth_link,
            amount: cryptoAmount,
            symbol: selectedAsset.symbol,
          });
      } else {
        this.setState({ showError: true });
      }
    } catch (e) {
      this.setState({ showError: true });
    }
  };

  /**
   * Renders a view that allows user to set payment request amount
   */
  renderEnterAmount = () => {
    const { conversionRate, contractExchangeRates, currentCurrency } =
      this.props;
    const {
      amount,
      secondaryAmount,
      symbol,
      cryptoAmount,
      showError,
      selectedAsset,
      internalPrimaryCurrency,
      chainId,
    } = this.state;
    const currencySymbol = currencySymbols[currentCurrency];
    const exchangeRate =
      selectedAsset &&
      selectedAsset.address &&
      contractExchangeRates[selectedAsset.address];
    let switchable = true;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    if (!conversionRate) {
      switchable = false;
    } else if (selectedAsset.symbol !== 'ETH' && !exchangeRate) {
      switchable = false;
    }
    return (
      <View style={styles.enterAmountWrapper} testID={'request-amount-screen'}>
        <View>
          <Text style={styles.title}>
            {strings('payment_request.enter_amount')}
          </Text>
        </View>
        <View style={styles.amountWrapper}>
          <View style={styles.container}>
            <View style={styles.ethContainer}>
              <View style={styles.amounts}>
                <View style={styles.split}>
                  {internalPrimaryCurrency !== 'ETH' && (
                    <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                  )}
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numeric"
                    numberOfLines={1}
                    onChangeText={this.updateAmount}
                    placeholder={strings('payment_request.amount_placeholder')}
                    placeholderTextColor={colors.text.muted}
                    spellCheck={false}
                    style={styles.input}
                    value={amount}
                    onSubmitEditing={this.onNext}
                    ref={this.amountInput}
                    {...generateTestId(Platform, REQUEST_AMOUNT_INPUT)}
                    keyboardAppearance={themeAppearance}
                  />
                  <Text
                    style={isTestNet(chainId) ? styles.testNetEth : styles.eth}
                    numberOfLines={1}
                  >
                    {symbol}
                  </Text>
                </View>
                <View style={styles.secondaryAmount}>
                  {secondaryAmount && internalPrimaryCurrency === 'ETH' && (
                    <Text style={styles.currencySymbolSmall}>
                      {currencySymbol}
                    </Text>
                  )}
                  {secondaryAmount && (
                    <Text style={styles.fiatValue} numberOfLines={1}>
                      {secondaryAmount}
                    </Text>
                  )}
                </View>
              </View>
              {switchable && (
                <View style={styles.switchContainer}>
                  <TouchableOpacity
                    onPress={this.switchPrimaryCurrency}
                    style={styles.switchTouchable}
                  >
                    <FontAwesome
                      name="exchange"
                      size={18}
                      color={colors.primary.default}
                      style={{ transform: [{ rotate: '270deg' }] }}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          {showError && (
            <View style={styles.errorWrapper}>
              <Text style={styles.errorText}>
                {strings('payment_request.request_error')}
              </Text>
            </View>
          )}
        </View>
        <KeyboardAvoidingView
          style={styles.buttonsWrapper}
          behavior={'padding'}
          keyboardVerticalOffset={KEYBOARD_OFFSET}
          enabled={Device.isIos()}
        >
          <View style={styles.buttonsContainer}>
            <StyledButton
              type={'normal'}
              onPress={this.onReset}
              containerStyle={[styles.button]}
            >
              {strings('payment_request.reset')}
            </StyledButton>
            <StyledButton
              type={'blue'}
              onPress={this.onNext}
              containerStyle={[styles.button]}
              disabled={!cryptoAmount || cryptoAmount === '0'}
            >
              {strings('payment_request.next')}
            </StyledButton>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  render() {
    const { mode } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.wrapper}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollViewContainer}
          keyboardShouldPersistTaps="handled"
        >
          {mode === MODE_SELECT
            ? this.renderSelectAssets()
            : this.renderEnterAmount()}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }
}

PaymentRequest.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  contractExchangeRates:
    state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  searchEngine: state.settings.searchEngine,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  tokens: state.engine.backgroundState.TokensController.tokens,
  primaryCurrency: state.settings.primaryCurrency,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  tokenList: getTokenListArray(state),
});

export default connect(mapStateToProps)(PaymentRequest);
