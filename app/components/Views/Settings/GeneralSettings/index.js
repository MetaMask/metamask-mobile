import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  StyleSheet,
  ScrollView,
  Switch,
  View,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect } from 'react-redux';
import IconCheck from 'react-native-vector-icons/MaterialCommunityIcons';

import Engine from '../../../../core/Engine';
import I18n, {
  strings,
  getLanguages,
  setLocale,
} from '../../../../../locales/i18n';
import infuraCurrencies from '../../../../util/infura-conversion.json';
import {
  setSearchEngine,
  setPrimaryCurrency,
  setAvatarAccountType,
  setHideZeroBalanceTokens,
  setHapticsEnabled,
} from '../../../../actions/settings';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  HeaderStandard,
  FilterButton,
  SegmentedControl,
  SectionDivider,
  BottomSheet,
  BottomSheetHeader,
} from '@metamask/design-system-react-native';
import PickerBase from '../../../../component-library/components/Pickers/PickerBase';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { enablePushNotifications } from '../../../../actions/notification/helpers';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../../selectors/notifications';

export const GENERAL_SETTINGS_CURRENCY_SELECTOR =
  'general-settings-currency-selector';

const diameter = 40;

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

export const updateUserTraitsWithCurrentCurrency = (currency) => {
  // track event and add selected currency to user profile for analytics
  const traits = { [UserProfileProperty.CURRENT_CURRENCY]: currency };
  analytics.identify(traits);
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents.CURRENCY_CHANGED)
      .addProperties({
        ...traits,
        location: 'app_settings',
      })
      .build(),
  );
};

export const updateUserTraitsWithCurrencyType = (primaryCurrency) => {
  // track event and add primary currency preference (fiat/crypto) to user profile for analytics
  const traits = { [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency };
  analytics.identify(traits);
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    content: {
      flex: 1,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 32,
    },
    title: {
      flex: 1,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    accessory: {
      marginTop: 12,
    },
    pickerTrigger: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      borderWidth: 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    selectedLabel: {
      flex: 1,
    },
    sheetContent: {
      maxHeight: 420,
    },
    sheetList: {
      paddingBottom: 24,
    },
    optionButton: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 48,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    optionButtonSelected: {
      backgroundColor: colors.background.muted,
    },
    optionLabel: {
      flex: 1,
    },
    optionIcon: {
      paddingLeft: 16,
    },
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    settingsPageSeparator: {
      backgroundColor: colors.border.muted,
      height: 1,
      opacity: 0.75,
    },
    sectionDivider: {
      backgroundColor: colors.background.muted,
      height: 6,
      marginHorizontal: -16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    firstSetting: {
      marginTop: 0,
    },
    inner: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 100,
    },
    identiconOptionsRow: {
      flexDirection: 'row',
      paddingTop: 8,
    },
    identiconOption: {
      alignItems: 'center',
      borderColor: colors.border.muted,
      borderRadius: 16,
      borderWidth: 1,
      flex: 1,
      minHeight: 112,
      paddingHorizontal: 8,
      paddingVertical: 14,
    },
    identiconOptionSpacing: {
      marginRight: 10,
    },
    identiconOptionSelected: {
      backgroundColor: colors.background.muted,
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    identiconLabel: {
      marginTop: 12,
      textAlign: 'center',
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
     * Whether push notifications are currently enabled
     */
    isPushNotificationsEnabled: PropTypes.bool,
    /**
     * Whether haptics are currently enabled
     */
    hapticsEnabled: PropTypes.bool,
    /**
     * Called to toggle haptics
     */
    setHapticsEnabled: PropTypes.func,
  };

  state = {
    activePicker: null,
    currentLanguage: I18n.locale.substr(0, 2),
    languages: {},
  };

  pickerSheetRef = React.createRef();

  selectCurrency = async (currency) => {
    const { CurrencyRateController, AssetsController } = Engine.context;
    CurrencyRateController.setCurrentCurrency(currency);
    // When the `assetsUnifyState` flag is enabled, the UI reads the active
    // currency from AssetsController.selectedCurrency rather than from
    // CurrencyRateController, so it must be updated here too. Otherwise the
    // selection silently no-ops and the displayed currency stays unchanged.
    AssetsController?.setSelectedCurrency?.(currency);
    updateUserTraitsWithCurrentCurrency(currency);
  };

  selectLanguage = (language) => {
    if (language === this.state.currentLanguage) return;
    setLocale(language);
    this.setState({ currentLanguage: language });

    if (this.props.isPushNotificationsEnabled) {
      enablePushNotifications().catch(() => {
        // Best-effort: token will be refreshed on next app launch
      });
    }

    setTimeout(() => this.props.navigation.navigate('Home'), 100);
  };

  selectSearchEngine = (searchEngine) => {
    this.props.setSearchEngine(searchEngine);
  };

  selectPrimaryCurrency = (primaryCurrency) => {
    this.props.setPrimaryCurrency(primaryCurrency);

    updateUserTraitsWithCurrencyType(primaryCurrency);
  };

  toggleHideZeroBalanceTokens = (toggleHideZeroBalanceTokens) => {
    this.props.setHideZeroBalanceTokens(toggleHideZeroBalanceTokens);
  };

  toggleHapticsEnabled = (hapticsEnabled) => {
    this.props.setHapticsEnabled(hapticsEnabled);
  };

  getSelectedPickerLabel = (options, selectedValue, defaultValue = '') => {
    const selectedOption = options?.find(
      (option) => option.value === selectedValue,
    );
    return selectedOption?.label ?? defaultValue;
  };

  showPickerSheet = (picker) => {
    Keyboard.dismiss();
    this.setState({ activePicker: picker }, () => {
      this.pickerSheetRef.current?.onOpenBottomSheet();
    });
  };

  hidePickerSheet = () => {
    this.pickerSheetRef.current?.onCloseBottomSheet(() => {
      this.setState({ activePicker: null });
    });
  };

  selectPickerValue = (value) => {
    this.state.activePicker?.onValueChange(value);
    this.hidePickerSheet();
  };

  renderPickerTrigger = ({
    label,
    options,
    selectedValue,
    onValueChange,
    testID,
  }) => {
    const themeTokens = this.context || mockTheme;
    const { colors } = themeTokens;
    const styles = createStyles(colors);

    return (
      <PickerBase
        onPress={() =>
          this.showPickerSheet({
            label,
            options,
            selectedValue,
            onValueChange,
          })
        }
        testID={testID}
        style={styles.pickerTrigger}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          style={styles.selectedLabel}
          numberOfLines={1}
        >
          {this.getSelectedPickerLabel(options, selectedValue)}
        </Text>
      </PickerBase>
    );
  };

  renderPickerSheet = () => {
    const { activePicker } = this.state;
    if (!activePicker) {
      return null;
    }

    const themeTokens = this.context || mockTheme;
    const { colors } = themeTokens;
    const styles = createStyles(colors);

    return (
      <BottomSheet
        ref={this.pickerSheetRef}
        onClose={() => this.setState({ activePicker: null })}
      >
        <BottomSheetHeader onClose={this.hidePickerSheet}>
          {activePicker.label}
        </BottomSheetHeader>
        <ScrollView
          style={styles.sheetContent}
          contentContainerStyle={styles.sheetList}
        >
          {activePicker.options.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => this.selectPickerValue(option.value)}
              style={[
                styles.optionButton,
                activePicker.selectedValue === option.value &&
                  styles.optionButtonSelected,
              ]}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                style={styles.optionLabel}
                numberOfLines={1}
              >
                {option.label}
              </Text>
              {activePicker.selectedValue === option.value ? (
                <IconCheck
                  style={styles.optionIcon}
                  name="check"
                  size={24}
                  color={themeTokens.brandColors.white}
                />
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    );
  };

  componentDidMount = () => {
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
      { value: 'Brave', label: 'Brave', key: 'Brave' },
    ];
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
  //         <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
      hapticsEnabled,
      navigation,
    } = this.props;
    const themeTokens = this.context || mockTheme;
    const { colors } = themeTokens;
    const styles = createStyles(colors);

    return (
      <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
        <HeaderStandard
          title={strings('app_settings.general_title')}
          onBack={() => navigation.goBack()}
          includesTopInset
        />
        <ScrollView style={styles.content}>
          <View style={styles.inner}>
            <View style={[styles.setting, styles.firstSetting]}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('app_settings.conversion_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.conversion_desc')}
              </Text>
              <View style={styles.accessory}>
                {this.renderPickerTrigger({
                  testID: GENERAL_SETTINGS_CURRENCY_SELECTOR,
                  selectedValue: currentCurrency,
                  onValueChange: this.selectCurrency,
                  label: strings('app_settings.current_conversion'),
                  options: infuraCurrencyOptions,
                })}
              </View>
            </View>
            <Box style={styles.settingsPageSeparator} />
            <View style={styles.setting}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('app_settings.primary_currency_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.primary_currency_desc')}
              </Text>
              <View style={styles.accessory}>
                <SegmentedControl
                  value={primaryCurrency === 'Fiat' ? 'Fiat' : 'ETH'}
                  onChange={this.selectPrimaryCurrency}
                  isFullWidth
                >
                  <FilterButton value="ETH">
                    {strings('app_settings.primary_currency_text_first')}
                  </FilterButton>
                  <FilterButton value="Fiat">
                    {strings('app_settings.primary_currency_text_second')}
                  </FilterButton>
                </SegmentedControl>
              </View>
            </View>
            <SectionDivider
              borderWidth={0}
              marginVertical={4}
              style={styles.sectionDivider}
            />
            <View style={styles.setting}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('app_settings.current_language')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.language_desc')}
              </Text>
              {this.languageOptions && (
                <View style={styles.accessory}>
                  {this.renderPickerTrigger({
                    selectedValue: this.state.currentLanguage,
                    onValueChange: this.selectLanguage,
                    label: strings('app_settings.current_language'),
                    options: this.languageOptions,
                  })}
                </View>
              )}
            </View>
            <Box style={styles.settingsPageSeparator} />
            <View style={styles.setting}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('app_settings.search_engine')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.engine_desc')}
              </Text>
              {this.searchEngineOptions && (
                <View style={styles.accessory}>
                  {this.renderPickerTrigger({
                    selectedValue: this.props.searchEngine,
                    onValueChange: this.selectSearchEngine,
                    label: strings('app_settings.search_engine'),
                    options: this.searchEngineOptions,
                  })}
                </View>
              )}
            </View>
            <SectionDivider
              borderWidth={0}
              marginVertical={4}
              style={styles.sectionDivider}
            />
            <View style={styles.setting}>
              <View style={styles.titleContainer}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  style={styles.title}
                >
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
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.hide_zero_balance_tokens_desc')}
              </Text>
            </View>
            <Box style={styles.settingsPageSeparator} />
            <View style={styles.setting}>
              <View style={styles.titleContainer}>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  style={styles.title}
                >
                  {strings('app_settings.haptic_feedback_title')}
                </Text>
                <View style={styles.toggle}>
                  <Switch
                    value={hapticsEnabled}
                    onValueChange={this.toggleHapticsEnabled}
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
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.haptic_feedback_desc')}
              </Text>
            </View>
            <SectionDivider
              borderWidth={0}
              marginVertical={4}
              style={styles.sectionDivider}
            />
            <View style={styles.setting}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('app_settings.accounts_identicon_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.accounts_identicon_desc')}
              </Text>
              <View style={styles.accessory}>
                <View style={styles.identiconOptionsRow}>
                  {[
                    {
                      label: 'Polycons',
                      type: AvatarAccountType.Maskicon,
                    },
                    {
                      label: strings('app_settings.jazzicons'),
                      type: AvatarAccountType.JazzIcon,
                    },
                    {
                      label: strings('app_settings.blockies'),
                      type: AvatarAccountType.Blockies,
                    },
                  ].map((option, index, options) => {
                    const isSelected = avatarAccountType === option.type;

                    return (
                      <TouchableOpacity
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        key={option.type}
                        onPress={() => setAvatarAccountType(option.type)}
                        style={[
                          styles.identiconOption,
                          index < options.length - 1 &&
                            styles.identiconOptionSpacing,
                          isSelected && styles.identiconOptionSelected,
                        ]}
                      >
                        <AvatarAccount
                          type={option.type}
                          accountAddress={selectedAddress}
                          size={diameter}
                        />
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Medium}
                          style={styles.identiconLabel}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
            {/* {this.renderThemeSettingsSection()} */}
          </View>
        </ScrollView>
        {this.renderPickerSheet()}
      </SafeAreaView>
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
  hapticsEnabled: state.settings.hapticsEnabled !== false,
  isPushNotificationsEnabled: selectIsMetaMaskPushNotificationsEnabled(state),
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
  setHapticsEnabled: (hapticsEnabled) =>
    dispatch(setHapticsEnabled(hapticsEnabled)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
