import React, { PureComponent } from 'react';
import {
  Text,
  TextInput,
  View,
  StyleSheet,
  InteractionManager,
  Platform,
  ScrollView,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import { isSmartContractAddress } from '../../../util/transactions';
import { MetaMetricsEvents } from '../../../core/Analytics';

import AppConstants from '../../../core/AppConstants';
import Alert, { AlertType } from '../../Base/Alert';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import NotificationManager from '../../../core/NotificationManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  CUSTOM_TOKEN_CONTAINER_ID,
  TOKEN_ADDRESS_INPUT_BOX_ID,
  TOKEN_ADDRESS_SYMBOL_ID,
  TOKEN_ADDRESS_WARNING_MESSAGE_ID,
  TOKEN_PRECISION_WARNING_MESSAGE_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';
import { NFT_IDENTIFIER_INPUT_BOX_ID } from '../../../../wdio/screen-objects/testIDs/Screens/NFTImportScreen.testIds';
import { regex } from '../../../../app/util/regex';
import {
  getBlockExplorerAddressUrl,
  getDecimalChainId,
} from '../../../util/networks';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import { formatIconUrlWithProxy } from '@metamask/assets-controllers';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import CLText from '../../../component-library/components/Texts/Text/Text';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    addressWrapper: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    rowWrapper: {
      paddingHorizontal: 16,
    },
    buttonWrapper: {
      paddingVertical: 20,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    link: {
      color: colors.info.default,
    },
    textInputError: {
      borderColor: colors.error.default,
      borderRadius: 8,
      borderWidth: 2,
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...fontStyles.normal,
    },
    textInputDisabled: {
      color: colors.text.muted,
      fontWeight: 'bold',
    },
    textInputFocus: {
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    inputLabel: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
    warningText: {
      ...fontStyles.normal,
      marginTop: 0,
      color: colors.error.default,
      paddingBottom: 8,
    },
    tokenDetectionBanner: { marginHorizontal: 20, marginTop: 20 },
    tokenDetectionDescription: { color: colors.text.default },
    tokenDetectionLink: { color: colors.primary.default },
    tokenDetectionIcon: {
      paddingTop: 4,
      paddingRight: 8,
    },
    import: {
      fontSize: 18,
      color: colors.primary.default,
      ...fontStyles.normal,
      position: 'relative',
      width: '90%',
      alignSelf: 'center',
    },
    textWrapper: {
      padding: 0,
    },
  });

/**
 * Copmonent that provides ability to add custom tokens.
 */
class AddCustomToken extends PureComponent {
  state = {
    address: '',
    symbol: '',
    decimals: '',
    name: '',
    warningAddress: '',
    warningSymbol: '',
    warningDecimals: '',
    isSymbolEditable: true,
    isDecimalEditable: true,
    onFocusAddress: false,
  };

  static propTypes = {
    /**
     * The chain ID for the current selected network
     */
    chainId: PropTypes.string,
    /**
     * The network name
     */
    networkName: PropTypes.string,
    /**
     * The network ticker
     */
    ticker: PropTypes.string,
    /**
     * The network type
     */
    type: PropTypes.string,
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Checks if token detection is supported
     */
    isTokenDetectionSupported: PropTypes.bool,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  getAnalyticsParams = () => {
    try {
      const { chainId } = this.props;
      const { address, symbol } = this.state;
      return {
        token_address: address,
        token_symbol: symbol,
        chain_id: getDecimalChainId(chainId),
        source: 'Custom token',
      };
    } catch (error) {
      return {};
    }
  };

  addToken = async () => {
    if (!(await this.validateCustomToken())) return;
    const { TokensController } = Engine.context;
    const { address, symbol, decimals, name } = this.state;
    await TokensController.addToken({ address, symbol, decimals, name });

    this.props.metrics.trackEvent(
      MetaMetricsEvents.TOKEN_ADDED,
      this.getAnalyticsParams(),
    );

    // Clear state before closing
    this.setState(
      {
        address: '',
        symbol: '',
        decimals: '',
        warningAddress: '',
        warningSymbol: '',
        warningDecimals: '',
      },
      () => {
        InteractionManager.runAfterInteractions(() => {
          this.props.navigation.goBack();
          this.props.navigation.goBack();
          NotificationManager.showSimpleNotification({
            status: `import_success`,
            duration: 5000,
            title: strings('wallet.token_toast.token_imported_title'),
            description: strings('wallet.token_toast.token_imported_desc_1'),
          });
        });
      },
    );
  };

  cancelAddToken = () => {
    this.props.navigation.goBack();
  };

  onAddressChange = async (address) => {
    this.setState({ address });
    if (address.length === 42) {
      try {
        this.setState({ isSymbolEditable: false });
        this.setState({ isDecimalEditable: false });

        const validated = await this.validateCustomTokenAddress(address);
        if (validated) {
          const { AssetsContractController } = Engine.context;
          const [decimals, symbol, name] = await Promise.all([
            AssetsContractController.getERC20TokenDecimals(address),
            AssetsContractController.getERC721AssetSymbol(address),
            AssetsContractController.getERC20TokenName(address),
          ]);

          this.setState({
            decimals: String(decimals),
            symbol,
            name,
          });
        } else {
          this.setState({ isSymbolEditable: true });
          this.setState({ isDecimalEditable: true });
        }
      } catch (e) {
        this.setState({ isSymbolEditable: true });
        this.setState({ isDecimalEditable: true });
      }
    } else {
      // We are cleaning other fields when changing the token address
      this.setState({
        decimals: '',
        symbol: '',
        name: '',
        warningAddress: '',
        warningSymbol: '',
        warningDecimals: '',
      });
    }
  };

  onSymbolChange = (symbol) => {
    this.setState({ symbol });
  };

  onDecimalsChange = (decimals) => {
    this.setState({ decimals });
  };

  validateCustomTokenAddress = async (address) => {
    let validated = true;
    const isValidTokenAddress = isValidAddress(address);

    const { chainId } = this.props;
    const toSmartContract =
      isValidTokenAddress && (await isSmartContractAddress(address, chainId));

    const addressWithoutSpaces = address.replace(regex.addressWithSpaces, '');

    if (addressWithoutSpaces.length === 0) {
      this.setState({
        warningAddress: strings('token.address_cant_be_empty'),
      });
      validated = false;
    } else if (!isValidTokenAddress) {
      this.setState({
        warningAddress: strings('token.address_must_be_valid'),
      });
      validated = false;
    } else if (!toSmartContract) {
      this.setState({
        warningAddress: strings('token.address_must_be_smart_contract'),
      });
      validated = false;
    } else {
      this.setState({ warningAddress: `` });
    }
    return validated;
  };

  validateCustomTokenSymbol = () => {
    let validated = true;
    const symbol = this.state.symbol;
    const symbolWithoutSpaces = symbol.replace(regex.addressWithSpaces, '');
    if (symbolWithoutSpaces.length === 0) {
      this.setState({ warningSymbol: strings('token.symbol_cant_be_empty') });
      validated = false;
    } else if (symbol.length >= 11) {
      this.setState({
        warningSymbol: strings('token.symbol_length'),
      });
    } else {
      this.setState({ warningSymbol: `` });
    }
    return validated;
  };

  validateCustomTokenDecimals = () => {
    let validated = true;
    const decimals = this.state.decimals;
    const decimalsWithoutSpaces = decimals.replace(regex.addressWithSpaces, '');
    if (decimalsWithoutSpaces.length === 0) {
      this.setState({
        warningDecimals: strings('token.decimals_is_required'),
      });
      validated = false;
    } else {
      this.setState({ warningDecimals: `` });
    }
    return validated;
  };

  validateCustomToken = async () => {
    const validatedAddress = await this.validateCustomTokenAddress(
      this.state.address,
    );
    const validatedSymbol = this.validateCustomTokenSymbol();
    const validatedDecimals = this.validateCustomTokenDecimals();
    return validatedAddress && validatedSymbol && validatedDecimals;
  };

  assetSymbolInput = React.createRef();
  assetPrecisionInput = React.createRef();

  jumpToAssetSymbol = () => {
    this.validateCustomToken();
    this.validateCustomTokenSymbol();
    this.setState({ showTokenSymbolAndDecimalsInput: true });
    this.setState({ isSymbolEditable: true });
  };

  handleFocusAddress = () => {
    this.setState({ onFocusAddress: true });
  };

  handleBlurAddress = () => {
    this.setState({ onFocusAddress: false });
  };

  jumpToAssetPrecision = () => {
    const { current } = this.assetPrecisionInput;
    current && current.focus();
  };

  renderInfoBanner = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Alert
        type={AlertType.Info}
        style={styles.tokenDetectionBanner}
        renderIcon={() => (
          <FontAwesome
            style={styles.tokenDetectionIcon}
            name={'exclamation-circle'}
            color={colors.primary.default}
            size={18}
          />
        )}
      >
        <>
          <Text style={styles.tokenDetectionDescription}>
            {strings('add_asset.banners.custom_info_desc')}
          </Text>
          <Text
            suppressHighlighting
            onPress={() => {
              navigation.navigate('Webview', {
                screen: 'SimpleWebview',
                params: {
                  url: AppConstants.URLS.SECURITY,
                  title: strings('add_asset.banners.custom_security_tips'),
                },
              });
            }}
            style={styles.tokenDetectionLink}
          >
            {strings('add_asset.banners.custom_info_link')}
          </Text>
        </>
      </Alert>
    );
  };

  renderWarningBanner = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const goToWebView = () => {
      // TODO: This functionality exists in a bunch of other places. We need to unify this into a utils function
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: AppConstants.URLS.SECURITY,
          title: strings('add_asset.banners.custom_security_tips'),
        },
      });
    };

    return (
      <View style={styles.tokenDetectionBanner}>
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Warning}
          description={
            <CLText>
              {strings('add_asset.banners.custom_warning_desc')}

              <CLText style={styles.link} onPress={() => goToWebView()}>
                {strings('add_asset.banners.custom_warning_link')}
              </CLText>
            </CLText>
          }
        />
      </View>
    );
  };

  goToConfirmAddToken = () => {
    const { symbol, address, name, decimals } = this.state;
    const { networkName, chainId, ticker } = this.props;
    const selectedAsset = [
      {
        symbol,
        address,
        iconUrl: formatIconUrlWithProxy({
          chainId: this.props.chainId,
          tokenAddress: this.state.address,
        }),
        name,
        decimals,
      },
    ];

    this.props.navigation.push('ConfirmAddAsset', {
      selectedAsset,
      networkName,
      chainId,
      ticker,
      addTokenList: this.addToken,
    });
  };

  renderBanner = () =>
    this.props.isTokenDetectionSupported
      ? this.renderWarningBanner()
      : this.renderInfoBanner();

  render = () => {
    const {
      onFocusAddress,
      isSymbolEditable,
      isDecimalEditable,
      symbol,
      decimals,
      warningSymbol,
      warningDecimals,
      warningAddress,
    } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);
    const isDisabled = !symbol || !decimals;

    const addressInputStyle = onFocusAddress
      ? { ...styles.textInput, ...styles.textInputFocus }
      : warningAddress
      ? styles.textInputError
      : styles.textInput;

    const textInputDecimalsStyle = !isDecimalEditable
      ? { ...styles.textInput, ...styles.textInputDisabled }
      : warningDecimals
      ? styles.textInputError
      : styles.textInput;

    const textInputSymbolStyle = !isSymbolEditable
      ? { ...styles.textInput, ...styles.textInputDisabled }
      : warningSymbol
      ? styles.textInputError
      : styles.textInput;

    const { title, url } = getBlockExplorerAddressUrl(
      this.props.type,
      this.state.address,
    );

    return (
      <View
        style={styles.wrapper}
        {...generateTestId(Platform, CUSTOM_TOKEN_CONTAINER_ID)}
      >
        <ScrollView>
          {this.renderBanner()}
          <View style={styles.addressWrapper}>
            <Text style={styles.inputLabel}>
              {strings('asset_details.address')}
            </Text>
            <TextInput
              style={addressInputStyle}
              placeholder={onFocusAddress ? '' : '0x...'}
              placeholderTextColor={colors.text.muted}
              value={this.state.address}
              onChangeText={this.onAddressChange}
              onFocus={this.handleFocusAddress}
              onBlur={() => {
                this.handleBlurAddress();
              }}
              {...generateTestId(Platform, TOKEN_ADDRESS_INPUT_BOX_ID)}
              onSubmitEditing={this.jumpToAssetSymbol}
              returnKeyType={'next'}
              keyboardAppearance={themeAppearance}
            />
            <Text
              style={styles.warningText}
              {...generateTestId(Platform, TOKEN_ADDRESS_WARNING_MESSAGE_ID)}
            >
              {this.state.warningAddress}
            </Text>
          </View>

          {this.state.address && !onFocusAddress && !warningAddress ? (
            <View style={styles.rowWrapper}>
              <Text style={styles.inputLabel}>
                {strings('token.token_symbol')}
              </Text>
              <TextInput
                style={textInputSymbolStyle}
                placeholder={'GNO'}
                placeholderTextColor={colors.text.muted}
                value={this.state.symbol}
                onChangeText={this.onSymbolChange}
                onBlur={this.validateCustomTokenSymbol}
                {...generateTestId(Platform, TOKEN_ADDRESS_SYMBOL_ID)}
                ref={this.assetSymbolInput}
                onSubmitEditing={this.jumpToAssetPrecision}
                returnKeyType={'next'}
                keyboardAppearance={themeAppearance}
                editable={isSymbolEditable}
              />
              <Text style={styles.warningText}>{this.state.warningSymbol}</Text>
            </View>
          ) : null}

          {this.state.address && !onFocusAddress && !warningAddress ? (
            <View style={styles.rowWrapper}>
              <Text style={styles.inputLabel}>
                {strings('token.token_decimal')}
              </Text>
              <TextInput
                style={textInputDecimalsStyle}
                value={this.state.decimals}
                keyboardType="numeric"
                maxLength={2}
                placeholder={'18'}
                placeholderTextColor={colors.text.muted}
                onChangeText={this.onDecimalsChange}
                onBlur={this.validateCustomTokenDecimals}
                {...generateTestId(Platform, NFT_IDENTIFIER_INPUT_BOX_ID)}
                ref={this.assetPrecisionInput}
                onSubmitEditing={this.addToken}
                returnKeyType={'done'}
                keyboardAppearance={themeAppearance}
                editable={isDecimalEditable}
              />

              {this.state.warningDecimals ? (
                <Text
                  style={styles.warningText}
                  {...generateTestId(
                    Platform,
                    TOKEN_PRECISION_WARNING_MESSAGE_ID,
                  )}
                >
                  {this.state.warningDecimals}{' '}
                  <Text
                    style={styles.link}
                    onPress={() => {
                      this.props.navigation.navigate('Webview', {
                        screen: 'SimpleWebview',
                        params: {
                          url,
                          title,
                        },
                      });
                    }}
                  >
                    {title}{' '}
                    <Icon
                      style={styles.link}
                      size={IconSize.Xss}
                      name={IconName.Export}
                    />
                  </Text>{' '}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('transaction.next')}
            style={styles.import}
            onPress={this.goToConfirmAddToken}
            isDisabled={isDisabled}
            testID="next-button-custom-import"
          />
        </View>
      </View>
    );
  };
}

AddCustomToken.contextType = ThemeContext;

export default withMetricsAwareness(AddCustomToken);
