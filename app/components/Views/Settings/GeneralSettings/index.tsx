import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import Engine from '../../../../core/Engine';
import I18n, {
  strings,
  getLanguages,
  setLocale,
} from '../../../../../locales/i18n';
import SelectComponent from '../../../UI/SelectComponent';
import infuraCurrencies from '../../../../util/infura-conversion.json';
import {
  setSearchEngine as setSearchEngineAction,
  setPrimaryCurrency as setPrimaryCurrencyAction,
  setAvatarAccountType as setAvatarAccountTypeAction,
  setHideZeroBalanceTokens as setHideZeroBalanceTokensAction,
  setHapticsEnabled as setHapticsEnabledAction,
} from '../../../../actions/settings';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import PickComponent from '../../PickComponent';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { useTheme } from '../../../../util/theme';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { enablePushNotifications } from '../../../../actions/notification/helpers';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../../selectors/notifications';
import type { RootState } from '../../../../reducers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { createStyles } from './GeneralSettings.styles';
import { SettingsToggleRow } from '../components/SettingsToggleRow';
import { AvatarTypeSelector } from './AvatarTypeSelector';
import { GeneralSettingsSelectorsIDs } from './GeneralSettings.testIds';

export const GENERAL_SETTINGS_CURRENCY_SELECTOR =
  'general-settings-currency-selector';

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

const searchEngineOptions = [
  { value: 'Google', label: 'Google', key: 'Google' },
  { value: 'DuckDuckGo', label: 'DuckDuckGo', key: 'DuckDuckGo' },
  { value: 'Brave', label: 'Brave', key: 'Brave' },
];

interface SelectOption {
  label: string;
  key: string;
  value: string;
}

interface SettingsState {
  searchEngine: string;
  primaryCurrency: string;
  avatarAccountType: AvatarAccountType;
  hideZeroBalanceTokens: boolean;
  hapticsEnabled?: boolean;
}

type SettingsRootState = Omit<RootState, 'settings'> & {
  settings: SettingsState;
};

interface StateProps {
  currentCurrency: string;
  searchEngine: string;
  primaryCurrency: string;
  avatarAccountType: AvatarAccountType;
  selectedAddress: string;
  hideZeroBalanceTokens: boolean;
  hapticsEnabled: boolean;
  isPushNotificationsEnabled: boolean;
}

interface DispatchProps {
  setSearchEngine: (searchEngine: string) => void;
  setPrimaryCurrency: (primaryCurrency: string) => void;
  setAvatarAccountType: (avatarAccountType: AvatarAccountType) => void;
  setHideZeroBalanceTokens: (hideZeroBalanceTokens: boolean) => void;
  setHapticsEnabled: (hapticsEnabled: boolean) => void;
}

interface OwnProps {
  navigation: AppNavigationProp;
}

type Props = OwnProps & StateProps & DispatchProps;
type SupportedCurrency = Parameters<
  (typeof Engine.context.AssetsController)['setSelectedCurrency']
>[0];

export const updateUserTraitsWithCurrentCurrency = (currency: string) => {
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

export const updateUserTraitsWithCurrencyType = (primaryCurrency: string) => {
  // track event and add primary currency preference (fiat/crypto) to user profile for analytics
  const traits = { [UserProfileProperty.PRIMARY_CURRENCY]: primaryCurrency };
  analytics.identify(traits);
};

/**
 * Main view for general app configurations
 */
const Settings = ({
  currentCurrency,
  navigation,
  setSearchEngine,
  setPrimaryCurrency,
  searchEngine,
  primaryCurrency,
  avatarAccountType,
  setAvatarAccountType,
  selectedAddress,
  hideZeroBalanceTokens,
  setHideZeroBalanceTokens,
  isPushNotificationsEnabled,
  hapticsEnabled,
  setHapticsEnabled,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [currentLanguage, setCurrentLanguage] = useState(
    I18n.locale.substr(0, 2),
  );
  const languageOptions = useMemo<SelectOption[]>(
    () =>
      Object.entries(getLanguages()).map(([key, label]) => ({
        value: key,
        label,
        key,
      })),
    [],
  );
  const navigationTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  useEffect(
    () => () => {
      if (navigationTimeoutRef.current !== undefined) {
        clearTimeout(navigationTimeoutRef.current);
      }
    },
    [],
  );

  const selectCurrency = async (currency: SupportedCurrency) => {
    const { CurrencyRateController, AssetsController } = Engine.context;
    CurrencyRateController.setCurrentCurrency(currency);
    // When the `assetsUnifyState` flag is enabled, the UI reads the active
    // currency from AssetsController.selectedCurrency rather than from
    // CurrencyRateController, so it must be updated here too. Otherwise the
    // selection silently no-ops and the displayed currency stays unchanged.
    AssetsController?.setSelectedCurrency?.(currency);
    updateUserTraitsWithCurrentCurrency(currency);
  };

  const selectLanguage = (language: string) => {
    if (language === currentLanguage) return;
    setLocale(language);
    setCurrentLanguage(language);

    if (isPushNotificationsEnabled) {
      enablePushNotifications().catch(() => {
        // Best-effort: token will be refreshed on next app launch
      });
    }

    if (navigationTimeoutRef.current !== undefined) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(
      () => navigation.navigate('Home'),
      100,
    );
  };

  const selectSearchEngine = (selectedSearchEngine: string) => {
    setSearchEngine(selectedSearchEngine);
  };

  const selectPrimaryCurrency = (selectedPrimaryCurrency: string) => {
    setPrimaryCurrency(selectedPrimaryCurrency);

    updateUserTraitsWithCurrencyType(selectedPrimaryCurrency);
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandard
        title={strings('app_settings.general_title')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: GeneralSettingsSelectorsIDs.BACK_BUTTON }}
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
              <SelectComponent
                testID={GENERAL_SETTINGS_CURRENCY_SELECTOR}
                selectedValue={currentCurrency}
                onValueChange={selectCurrency}
                label={strings('app_settings.current_conversion')}
                options={infuraCurrencyOptions}
              />
            </View>
          </View>
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
              <PickComponent
                pick={selectPrimaryCurrency}
                textFirst={strings('app_settings.primary_currency_text_first')}
                valueFirst={'ETH'}
                textSecond={strings(
                  'app_settings.primary_currency_text_second',
                )}
                valueSecond={'Fiat'}
                selectedValue={primaryCurrency}
              />
            </View>
          </View>
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
            <View style={styles.accessory}>
              <SelectComponent
                selectedValue={currentLanguage}
                onValueChange={selectLanguage}
                label={strings('app_settings.current_language')}
                options={languageOptions}
              />
            </View>
          </View>
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
            <View style={styles.accessory}>
              <SelectComponent
                selectedValue={searchEngine}
                onValueChange={selectSearchEngine}
                label={strings('app_settings.search_engine')}
                options={searchEngineOptions}
              />
            </View>
          </View>
          <SettingsToggleRow
            title={strings('app_settings.hide_zero_balance_tokens_title')}
            description={strings('app_settings.hide_zero_balance_tokens_desc')}
            value={hideZeroBalanceTokens}
            onValueChange={setHideZeroBalanceTokens}
          />
          <SettingsToggleRow
            title={strings('app_settings.haptic_feedback_title')}
            description={strings('app_settings.haptic_feedback_desc')}
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
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
              <AvatarTypeSelector
                address={selectedAddress}
                onChange={setAvatarAccountType}
                selectedType={avatarAccountType}
                styles={styles}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const mapStateToProps = (state: SettingsRootState): StateProps => ({
  currentCurrency: selectCurrentCurrency(state),
  searchEngine: state.settings.searchEngine,
  primaryCurrency: state.settings.primaryCurrency,
  avatarAccountType: state.settings.avatarAccountType,
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state) ?? '',
  hideZeroBalanceTokens: state.settings.hideZeroBalanceTokens,
  hapticsEnabled: state.settings.hapticsEnabled !== false,
  isPushNotificationsEnabled: selectIsMetaMaskPushNotificationsEnabled(state),
  // appTheme: state.user.appTheme,
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  setSearchEngine: (searchEngine: string) =>
    dispatch(setSearchEngineAction(searchEngine)),
  setPrimaryCurrency: (primaryCurrency: string) =>
    dispatch(setPrimaryCurrencyAction(primaryCurrency)),
  setAvatarAccountType: (avatarAccountType: AvatarAccountType) =>
    dispatch(setAvatarAccountTypeAction(avatarAccountType)),
  setHideZeroBalanceTokens: (hideZeroBalanceTokens: boolean) =>
    dispatch(setHideZeroBalanceTokensAction(hideZeroBalanceTokens)),
  setHapticsEnabled: (hapticsEnabled: boolean) =>
    dispatch(setHapticsEnabledAction(hapticsEnabled)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
