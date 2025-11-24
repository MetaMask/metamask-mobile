import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  StyleSheet,
  ScrollView,
  Switch,
  View,
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
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import {
  setSearchEngine,
  setPrimaryCurrency,
  setAvatarAccountType,
  setHideZeroBalanceTokens,
} from '../../../../actions/settings';
import PickComponent from '../../PickComponent';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { withMetricsAwareness } from '../../../../components/hooks/useMetrics';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { colors as staticColors } from '../../../../styles/common';

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

export const updateUserTraitsWithCurrentCurrency = (currency, metrics) => {
  // track event and add selected currency to user profile for analytics
  const traits = { [UserProfileProperty.CURRENT_CURRENCY]: currency };
  metrics.addTraitsToUser(traits);
  metrics.trackEvent(
    MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.CURRENCY_CHANGED)
      .addProperties({
        ...traits,
        location: 'app_settings',
      })
      .build(),
  );
};

export const updateUserTraitsWithCurrencyType = (primaryCurrency, metrics) => {
  // track event and add primary currency preference (fiat/crypto) to user profile for analytics
  const traits = { [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency };
  metrics.addTraitsToUser(traits);
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 16,
      zIndex: 99999999999999,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    toggle: {
      marginLeft: 16,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
    },
    setting: {
      marginTop: 30,
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
      flexDirection: 'row',
    },
    identicon_row: {
      width: '33%',
      alignItems: 'center',
      flexDirection: 'column',
    },
    identiconText: {
      marginTop: 12,
    },
    blockie: {
      height: diameter,
      width: diameter,
      borderRadius: diameter / 2,
    },
    avatarWrapper: {
      borderRadius: 12,
      width: diameter + 4, // 40 (diameter) + 2*2 (border width)
      height: diameter + 4, // 40 (diameter) + 2*2 (border width)
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedAvatarWrapper: {
      borderColor: colors.primary.default,
    },
    unselectedAvatarWrapper: {
      borderColor: staticColors.transparent,
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
     * Selected avatar style (Maskicon | Blockies | JazzIcon)
     */
    avatarAccountType: PropTypes.string,
    /**
     * Called to set avatar style
     */
    setAvatarAccountType: PropTypes.func,
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
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  state = {
    currentLanguage: I18n.locale.substr(0, 2),
    languages: {},
  };

  selectCurrency = async (currency) => {
    const { CurrencyRateController } = Engine.context;
    CurrencyRateController.setCurrentCurrency(currency);
    updateUserTraitsWithCurrentCurrency(currency, this.props.metrics);
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

    updateUserTraitsWithCurrencyType(primaryCurrency, this.props.metrics);
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
      { value: 'Google', label: 'Google', key: 'Google' },
      { value: 'DuckDuckGo', label: 'DuckDuckGo', key: 'DuckDuckGo' },
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
  //         <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
      avatarAccountType,
      setAvatarAccountType,
      selectedAddress,
      hideZeroBalanceTokens,
    } = this.props;
    const themeTokens = this.context || mockTheme;
    const { colors } = themeTokens;
    const styles = createStyles(colors);

    return (
      <ScrollView style={styles.wrapper}>
        <View style={styles.inner}>
          <View style={[styles.setting, styles.firstSetting]}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('app_settings.conversion_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.desc}
            >
              {strings('app_settings.conversion_desc')}
            </Text>
            <View style={styles.accessory}>
              <View style={styles.picker}>
                <SelectComponent
                  selectedValue={currentCurrency}
                  onValueChange={this.selectCurrency}
                  label={strings('app_settings.current_conversion')}
                  options={infuraCurrencyOptions}
                />
              </View>
            </View>
          </View>
          <View style={styles.setting}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('app_settings.primary_currency_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.desc}
            >
              {strings('app_settings.primary_currency_desc')}
            </Text>
            {this.primaryCurrencyOptions && (
              <View style={styles.accessory}>
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
              </View>
            )}
          </View>
          <View style={styles.setting}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('app_settings.current_language')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.desc}
            >
              {strings('app_settings.language_desc')}
            </Text>
            {this.languageOptions && (
              <View style={styles.accessory}>
                <View style={styles.picker}>
                  <SelectComponent
                    selectedValue={this.state.currentLanguage}
                    onValueChange={this.selectLanguage}
                    label={strings('app_settings.current_language')}
                    options={this.languageOptions}
                  />
                </View>
              </View>
            )}
          </View>
          <View style={styles.setting}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('app_settings.search_engine')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.desc}
            >
              {strings('app_settings.engine_desc')}
            </Text>
            {this.searchEngineOptions && (
              <View style={styles.accessory}>
                <View style={styles.picker}>
                  <SelectComponent
                    selectedValue={this.props.searchEngine}
                    onValueChange={this.selectSearchEngine}
                    label={strings('app_settings.search_engine')}
                    options={this.searchEngineOptions}
                  />
                </View>
              </View>
            )}
          </View>
          <View style={styles.setting}>
            <View style={styles.titleContainer}>
              <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
                {strings('app_settings.hide_zero_balance_tokens_title')}
              </Text>
              <View style={styles.toggle}>
                <Switch
                  value={hideZeroBalanceTokens}
                  onValueChange={this.toggleHideZeroBalanceTokens}
                  trackColor={{
                    true: colors.primary.default,
                    false: colors.border.muted,
                  }}
                  thumbColor={themeTokens.brandColors.white}
                  style={styles.switch}
                  ios_backgroundColor={colors.border.muted}
                />
              </View>
            </View>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.desc}
            >
              {strings('app_settings.hide_zero_balance_tokens_desc')}
            </Text>
          </View>
          <View style={styles.setting}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('app_settings.accounts_identicon_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.desc}
            >
              {strings('app_settings.accounts_identicon_desc')}
            </Text>
            <View style={styles.accessory}>
              <View style={styles.identicon_container}>
                <TouchableOpacity
                  onPress={() =>
                    setAvatarAccountType(AvatarAccountType.Maskicon)
                  }
                  style={styles.identicon_row}
                >
                  <View
                    style={[
                      styles.avatarWrapper,
                      avatarAccountType === AvatarAccountType.Maskicon
                        ? styles.selectedAvatarWrapper
                        : styles.unselectedAvatarWrapper,
                    ]}
                  >
                    <AvatarAccount
                      type={AvatarAccountType.Maskicon}
                      accountAddress={selectedAddress}
                      size={diameter}
                    />
                  </View>
                  <Text style={styles.identiconText}>Polycons</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setAvatarAccountType(AvatarAccountType.JazzIcon)
                  }
                  style={styles.identicon_row}
                >
                  <View
                    style={[
                      styles.avatarWrapper,
                      avatarAccountType === AvatarAccountType.JazzIcon
                        ? styles.selectedAvatarWrapper
                        : styles.unselectedAvatarWrapper,
                    ]}
                  >
                    <AvatarAccount
                      type={AvatarAccountType.JazzIcon}
                      accountAddress={selectedAddress}
                      size={diameter}
                    />
                  </View>
                  <Text style={styles.identiconText}>
                    {strings('app_settings.jazzicons')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setAvatarAccountType(AvatarAccountType.Blockies)
                  }
                  style={styles.identicon_row}
                >
                  <View
                    style={[
                      styles.avatarWrapper,
                      avatarAccountType === AvatarAccountType.Blockies
                        ? styles.selectedAvatarWrapper
                        : styles.unselectedAvatarWrapper,
                    ]}
                  >
                    <AvatarAccount
                      type={AvatarAccountType.Blockies}
                      accountAddress={selectedAddress}
                      size={diameter}
                    />
                  </View>
                  <Text style={styles.identiconText}>
                    {strings('app_settings.blockies')}
                  </Text>
                </TouchableOpacity>
              </View>
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
  avatarAccountType: state.settings.avatarAccountType,
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  hideZeroBalanceTokens: state.settings.hideZeroBalanceTokens,
  // appTheme: state.user.appTheme,
});

const mapDispatchToProps = (dispatch) => ({
  setSearchEngine: (searchEngine) => dispatch(setSearchEngine(searchEngine)),
  setPrimaryCurrency: (primaryCurrency) =>
    dispatch(setPrimaryCurrency(primaryCurrency)),
  setAvatarAccountType: (avatarAccountType) =>
    dispatch(setAvatarAccountType(avatarAccountType)),
  setHideZeroBalanceTokens: (hideZeroBalanceTokens) =>
    dispatch(setHideZeroBalanceTokens(hideZeroBalanceTokens)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Settings));
