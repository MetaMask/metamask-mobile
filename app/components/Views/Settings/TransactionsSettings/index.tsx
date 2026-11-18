import React from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import {
  selectSmartTransactionsOptInStatus,
  selectUseTransactionSimulations,
} from '../../../../selectors/preferencesController';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import AppConstants from '../../../../../app/core/AppConstants';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SettingsToggleRow } from '../components/SettingsToggleRow';
import createStyles from './TransactionsSettings.styles';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import { useNavigation } from '@react-navigation/native';
import { SIMULATION_DETALS_ARTICLE_URL } from '../../../../constants/urls';
import { trackExternalLinkClicked } from '../../../../util/analytics/externalLinkTracking';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import OldButton, {
  ButtonVariants,
  ButtonSize as OldButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { TextVariant as LibraryTextVariant } from '../../../../component-library/components/Texts/Text';
import BatchAccountBalanceSettings from '../BatchAccountBalanceSettings';

function TransactionsSettings() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const {
    styles,
    theme: { colors, brandColors },
  } = useStyles(createStyles, {});
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const smartTransactionsOptInStatus = useSelector(
    selectSmartTransactionsOptInStatus,
  );
  const useTransactionSimulations = useSelector(
    selectUseTransactionSimulations,
  );
  const isBasicFunctionalityConsolidationEnabled = useSelector(
    selectIsBasicFunctionalityConsolidationEnabled,
  );

  const showHexData = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.settings.showHexData,
  );

  function trackMetricsEvent(
    event: Parameters<typeof AnalyticsEventBuilder.createEventBuilder>[0],
    properties: Record<string, unknown>,
  ) {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties({
          location: 'Transactions Settings',
          ...properties,
        })
        .build(),
    );
  }

  function toggleSmartTransactionsOptInStatus(optInStatus: boolean) {
    const { PreferencesController } = Engine.context;
    PreferencesController.setSmartTransactionsOptInStatus(optInStatus);

    trackMetricsEvent(MetaMetricsEvents.SMART_TRANSACTION_OPT_IN, {
      stx_opt_in: optInStatus,
    });
  }

  function toggleShowHexData(value: boolean) {
    const { PreferencesController } = Engine.context;
    PreferencesController.setFeatureFlag('showHexData', value);
  }

  function openLinkAboutStx() {
    Linking.openURL(AppConstants.URLS.SMART_TXS);
  }

  function toggleUseTransactionSimulations(value: boolean) {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTransactionSimulations(value);
  }

  function renderUseTransactionSimulations() {
    return (
      <View style={styles.setting}>
        <View style={styles.titleContainer}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={styles.title}
          >
            {strings('app_settings.simulation_details')}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          style={styles.desc}
        >
          {strings('app_settings.simulation_details_description')}
          <OldButton
            variant={ButtonVariants.Link}
            size={OldButtonSize.Auto}
            labelTextVariant={LibraryTextVariant.BodySMMedium}
            onPress={() => {
              Linking.openURL(SIMULATION_DETALS_ARTICLE_URL);
              trackExternalLinkClicked(trackEvent, createEventBuilder, {
                location: 'app_settings',
                text: strings('app_settings.simulation_details_learn_more'),
                url_domain: SIMULATION_DETALS_ARTICLE_URL,
              });
            }}
            label={strings('app_settings.simulation_details_learn_more')}
          />
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        testID="header"
        title={strings('app_settings.transactions_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <KeyboardAwareScrollView
        style={styles.scrollView}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        <View style={styles.inner}>
          <View style={[styles.setting, styles.firstSetting]}>
            <Text variant={TextVariant.HeadingMd} style={styles.heading}>
              {strings('app_settings.transactions_subheading')}
            </Text>
          </View>

          <SettingsToggleRow
            title={strings('app_settings.smart_transactions_opt_in_heading')}
            description={
              <>
                {strings(
                  'app_settings.smart_transactions_opt_in_desc_supported_networks',
                )}{' '}
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.PrimaryDefault}
                  accessibilityRole="link"
                  onPress={openLinkAboutStx}
                >
                  {strings('app_settings.smart_transactions_learn_more')}
                </Text>
              </>
            }
            value={smartTransactionsOptInStatus}
            onValueChange={toggleSmartTransactionsOptInStatus}
          />

          <SettingsToggleRow
            title={strings('app_settings.show_hex_data')}
            description={strings('app_settings.hex_desc')}
            value={showHexData}
            onValueChange={toggleShowHexData}
          />

          {!isBasicFunctionalityConsolidationEnabled && (
            <>
              <BatchAccountBalanceSettings />
              <SettingsToggleRow
                title={strings('app_settings.simulation_details')}
                description={
                  <>
                    {strings('app_settings.simulation_details_description')}{' '}
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.PrimaryDefault}
                      accessibilityRole="link"
                      onPress={() => {
                        Linking.openURL(SIMULATION_DETALS_ARTICLE_URL);
                        trackExternalLinkClicked(
                          trackEvent,
                          createEventBuilder,
                          {
                            location: 'app_settings',
                            text: strings(
                              'app_settings.simulation_details_learn_more',
                            ),
                            url_domain: SIMULATION_DETALS_ARTICLE_URL,
                          },
                        );
                      }}
                    >
                      {strings('app_settings.simulation_details_learn_more')}
                    </Text>
                  </>
                }
                value={useTransactionSimulations}
                onValueChange={toggleUseTransactionSimulations}
              />
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export default TransactionsSettings;
