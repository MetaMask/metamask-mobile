import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  Switch,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { connect } from 'react-redux';

import Engine from '../../../../core/Engine';
import I18n, {
  strings,
  getLanguages,
  setLocale,
} from '../../../../../locales/i18n';
import SelectComponent from '../../../UI/SelectComponent';
import infuraCurrencies from '../../../../util/infura-conversion.json';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import {
  setSearchEngine,
  setPrimaryCurrency,
  setUseBlockieIcon,
  setHideZeroBalanceTokens,
} from '../../../../actions/settings';
import PickComponent from '../../PickComponent';
import { toDataUrl } from '../../../../util/blockies.js';
import Jazzicon from 'react-native-jazzicon';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectSelectedAddress } from '../../../../selectors/preferencesController';
// import { AppThemeKey } from '../../../../util/theme/models';
// import StyledButton from '../../../UI/StyledButton';

const diameter = 40;
const spacing = 8;

const sortedCurrencies = infuraCurrencies.objects.sort((a, b) =>
  a.quote.code
    .toLocaleLowerCase()
    .localeCompare(b.quote.code.toLocaleLowerCase()),
);

const infuraCurrencyOptions = sortedCurrencies.map(
  ({ quote: { code, name } }) => ({
    label: `${code.toUpperCase()} - ${name}`,
    key: code,
    value: code,
  }),
);

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      zIndex: 99999999999999,
    },
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    desc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    marginTop: {
      marginTop: 18,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    simplePicker: {
      marginTop: 16,
    },
    setting: {
      marginTop: 50,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    firstSetting: {
      marginTop: 0,
    },
    inner: {
      paddingBottom: 100,
    },
    identicon_container: {
      marginVertical: 16,
      display: 'flex',
      flexDirection: 'row',
    },
    identicon_row: {
      width: '50%',
      alignItems: 'center',
      flexDirection: 'row',
    },
    identicon_type: {
      ...fontStyles.bold,
      fontSize: 14,
      marginHorizontal: 10,
      color: colors.text.default,
    },
    blockie: {
      height: diameter,
      width: diameter,
      borderRadius: diameter / 2,
    },
    border: {
      height: diameter + spacing,
      width: diameter + spacing,
      borderRadius: (diameter + spacing) / 2,
      backgroundColor: colors.background.default,
      borderWidth: 2,
      borderColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selected: {
      borderColor: colors.primary.default,
    },
    selected_text: {
      color: colors.text.default,
    },
  });

/**
 * Main view for general app configurations
 */
class Settings extends PureComponent {
  static propTypes = {
    /**
    /* State current currency
    */
    currentCurrency: PropTypes.string,
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Called to set the active search engine
     */
    setSearchEngine: PropTypes.func,
    /**
     * Called to set primary currency
     */
    setPrimaryCurrency: PropTypes.func,
    /**
     * Active search engine
     */
    searchEngine: PropTypes.string,
    /**
     * Active primary currency
     */
    primaryCurrency: PropTypes.string,
    /**
     * Show a BlockieIcon instead of JazzIcon
     */
    useBlockieIcon: PropTypes.bool,
    /**
     * called to toggle BlockieIcon
     */
    setUseBlockieIcon: PropTypes.func,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * A bool that represents if the user wants to hide zero balance token
     */
    hideZeroBalanceTokens: PropTypes.bool,
    /**
     * Called to toggle zero balance token display
     */
    setHideZeroBalanceTokens: PropTypes.func,
    /**
     * App theme
     */
    // appTheme: PropTypes.string,
  };

  state = {
    currentLanguage: I18n.locale.substr(0, 2),
    languages: {},
  };

  selectCurrency = async (currency) => {
    const { CurrencyRateController } = Engine.context;
    CurrencyRateController.setCurrentCurrency(currency);
  };

  selectLanguage = (language) => {
    if (language === this.state.currentLanguage) return;
    setLocale(language);
    this.setState({ currentLanguage: language });
    setTimeout(() => this.props.navigation.navigate('Home'), 100);
  };

  selectSearchEngine = (searchEngine) => {
    this.props.setSearchEngine(searchEngine);
  };

  selectPrimaryCurrency = (primaryCurrency) => {
    this.props.setPrimaryCurrency(primaryCurrency);
  };

  toggleHideZeroBalanceTokens = (toggleHideZeroBalanceTokens) => {
    this.props.setHideZeroBalanceTokens(toggleHideZeroBalanceTokens);
  };

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.general_title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount = () => {
    this.updateNavBar();
    const languages = getLanguages();
    this.setState({ languages });
    this.languageOptions = Object.keys(languages).map((key) => ({
      value: key,
      label: languages[key],
      key,
    }));
    this.searchEngineOptions = [
      { value: 'DuckDuckGo', label: 'DuckDuckGo', key: 'DuckDuckGo' },
      { value: 'Google', label: 'Google', key: 'Google' },
    ];
    this.primaryCurrencyOptions = [
      {
        value: 'ETH',
        label: strings('app_settings.primary_currency_text_first'),
        key: 'Native',
      },
      {
        value: 'Fiat',
        label: strings('app_settings.primary_currency_text_second'),
        key: 'Fiat',
      },
    ];
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  // TODO - Reintroduce once we enable manual theme settings
  // goToThemeSettings = () => {
  //   const { navigation } = this.props;
  //   navigation.navigate('ThemeSettings');
  // };

  // renderThemeSettingsSection = () => {
  //   const { appTheme } = this.props;
  //   const colors = this.context.colors || mockTheme.colors;
  //   const styles = createStyles(colors);

  //   return (
  //     <View style={styles.setting}>
  //       <View>
  //         <Text style={styles.title}>
  //           {strings('app_settings.theme_title', {
  //             theme: strings(`app_settings.theme_${AppThemeKey[appTheme]}`),
  //           })}
  //         </Text>
  //         <Text style={styles.desc}>{strings('app_settings.theme_description')}</Text>
  //         <StyledButton type="normal" onPress={this.goToThemeSettings} containerStyle={styles.marginTop}>
  //           {strings('app_settings.theme_button_text')}
  //         </StyledButton>
  //       </View>
  //     </View>
  //   );
  // };

  render() {
    const {
      currentCurrency,
      primaryCurrency,
      useBlockieIcon,
      setUseBlockieIcon,
      selectedAddress,
      hideZeroBalanceTokens,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <ScrollView style={styles.wrapper}>
        <View style={styles.inner}>
          <View style={[styles.setting, styles.firstSetting]}>
            <Text style={styles.title}>
              {strings('app_settings.conversion_title')}
            </Text>
            <Text style={styles.desc}>
              {strings('app_settings.conversion_desc')}
            </Text>
            <View style={styles.picker}>
              <SelectComponent
                selectedValue={currentCurrency}
                onValueChange={this.selectCurrency}
                label={strings('app_settings.current_conversion')}
                options={infuraCurrencyOptions}
              />
            </View>
          </View>
          <View style={styles.setting}>
            <Text style={styles.title}>
              {strings('app_settings.primary_currency_title')}
            </Text>
            <Text style={styles.desc}>
              {strings('app_settings.primary_currency_desc')}
            </Text>
            <View style={styles.simplePicker}>
              {this.primaryCurrencyOptions && (
                <PickComponent
                  pick={this.selectPrimaryCurrency}
                  textFirst={strings(
                    'app_settings.primary_currency_text_first',
                  )}
                  valueFirst={'ETH'}
                  textSecond={strings(
                    'app_settings.primary_currency_text_second',
                  )}
                  valueSecond={'Fiat'}
                  selectedValue={primaryCurrency}
                />
              )}
            </View>
          </View>
          <View style={styles.setting}>
            <Text style={styles.title}>
              {strings('app_settings.current_language')}
            </Text>
            <Text style={styles.desc}>
              {strings('app_settings.language_desc')}
            </Text>
            <View style={styles.picker}>
              {this.languageOptions && (
                <SelectComponent
                  selectedValue={this.state.currentLanguage}
                  onValueChange={this.selectLanguage}
                  label={strings('app_settings.current_language')}
                  options={this.languageOptions}
                />
              )}
            </View>
          </View>
          <View style={styles.setting}>
            <Text style={styles.title}>
              {strings('app_settings.search_engine')}
            </Text>
            <Text style={styles.desc}>
              {strings('app_settings.engine_desc')}
            </Text>
            <View style={styles.picker}>
              {this.searchEngineOptions && (
                <SelectComponent
                  selectedValue={this.props.searchEngine}
                  onValueChange={this.selectSearchEngine}
                  label={strings('app_settings.search_engine')}
                  options={this.searchEngineOptions}
                />
              )}
            </View>
          </View>
          <View style={styles.setting}>
            <Text style={styles.title}>
              {strings('app_settings.hide_zero_balance_tokens_title')}
            </Text>
            <Text style={styles.desc}>
              {strings('app_settings.hide_zero_balance_tokens_desc')}
            </Text>
            <View style={styles.marginTop}>
              <Switch
                value={hideZeroBalanceTokens}
                onValueChange={this.toggleHideZeroBalanceTokens}
                trackColor={{
                  true: colors.primary.default,
                  false: colors.border.muted,
                }}
                thumbColor={importedColors.white}
                style={styles.switch}
                ios_backgroundColor={colors.border.muted}
              />
            </View>
          </View>
          <View style={styles.setting}>
            <Text style={styles.title}>
              {strings('app_settings.accounts_identicon_title')}
            </Text>
            <Text style={styles.desc}>
              {strings('app_settings.accounts_identicon_desc')}
            </Text>
            <View style={styles.identicon_container}>
              <TouchableOpacity
                onPress={() => setUseBlockieIcon(false)}
                style={styles.identicon_row}
              >
                <View
                  style={[styles.border, !useBlockieIcon && styles.selected]}
                >
                  <Jazzicon size={diameter} address={selectedAddress} />
                </View>
                <Text
                  style={[
                    styles.identicon_type,
                    !useBlockieIcon && styles.selected_text,
                  ]}
                >
                  {strings('app_settings.jazzicons')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUseBlockieIcon(true)}
                style={styles.identicon_row}
              >
                <View
                  style={[styles.border, useBlockieIcon && styles.selected]}
                >
                  <Image
                    source={{ uri: toDataUrl(selectedAddress) }}
                    style={styles.blockie}
                  />
                </View>
                <Text
                  style={[
                    styles.identicon_type,
                    useBlockieIcon && styles.selected_text,
                  ]}
                >
                  {strings('app_settings.blockies')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* {this.renderThemeSettingsSection()} */}
        </View>
      </ScrollView>
    );
  }
}

Settings.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  currentCurrency: selectCurrentCurrency(state),
  searchEngine: state.settings.searchEngine,
  primaryCurrency: state.settings.primaryCurrency,
  useBlockieIcon: state.settings.useBlockieIcon,
  selectedAddress: selectSelectedAddress(state),
  hideZeroBalanceTokens: state.settings.hideZeroBalanceTokens,
  // appTheme: state.user.appTheme,
});

const mapDispatchToProps = (dispatch) => ({
  setSearchEngine: (searchEngine) => dispatch(setSearchEngine(searchEngine)),
  setPrimaryCurrency: (primaryCurrency) =>
    dispatch(setPrimaryCurrency(primaryCurrency)),
  setUseBlockieIcon: (useBlockieIcon) =>
    dispatch(setUseBlockieIcon(useBlockieIcon)),
  setHideZeroBalanceTokens: (hideZeroBalanceTokens) =>
    dispatch(setHideZeroBalanceTokens(hideZeroBalanceTokens)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
