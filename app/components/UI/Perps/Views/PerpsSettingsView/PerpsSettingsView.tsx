import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  ListItem,
  ListItemVariant,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectPerpsBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/perpsBrandRefresh';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import PerpsDefaultExchangeSheet from '../../components/PerpsDefaultExchangeSheet';
import PerpsMoreSection, {
  type PerpsMoreItem,
} from '../../components/PerpsMoreSection';
import PerpsProviderLogos from '../../components/PerpsProviderLogos';
import { PROVIDER_DISPLAY_INFO } from '../../components/PerpsProviderSelector/PerpsProviderSelector.constants';
import { PERPS_SETTINGS_SCREEN_TYPE } from '../../constants/perpsSettingsAnalytics';
import {
  FEEDBACK_CONFIG,
  LEARN_MORE_CONFIG,
  PROVIDER_CONFIG,
  SUPPORT_CONFIG,
} from '../../constants/perpsConfig';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { useSetPerpsDefaultExchange } from '../../hooks/useSetPerpsDefaultExchange';
import { PerpsSettingsViewSelectorsIDs } from '../../Perps.testIds';
import {
  selectPerpsFeedbackEnabledFlag,
  selectPerpsLighterProviderEnabledFlag,
} from '../../selectors/featureFlags';
import {
  selectPerpsDefaultProvider,
  selectPerpsHasExplicitDefaultProviderSelection,
} from '../../selectors/perpsController';

/**
 * Venue shown on the settings row. An automatic persistence of Hyperliquid
 * is not a user choice, so the row stays on Hyperliquid until they save one.
 *
 * @param defaultProvider - Saved routing default, if the controller has one.
 * @param hasExplicitSelection - True after `setDefaultProvider` saved a choice.
 * @returns The venue the settings row and sheet should preselect.
 */
export function displayedDefaultExchange(
  defaultProvider: PerpsProviderType | null,
  hasExplicitSelection: boolean,
): PerpsProviderType {
  if (!hasExplicitSelection || !defaultProvider) {
    return PROVIDER_CONFIG.DefaultProvider;
  }
  return defaultProvider;
}

const PerpsSettingsView = (): React.JSX.Element => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const analytics = useAnalytics();
  const { openSupportWithConsent } = useSupportConsent();
  const isBrandRefresh = useSelector(selectPerpsBrandRefreshEnabled);
  const isLighterEnabled = useSelector(selectPerpsLighterProviderEnabledFlag);
  const isFeedbackEnabled = useSelector(selectPerpsFeedbackEnabledFlag);
  const defaultProvider = useSelector(selectPerpsDefaultProvider);
  const hasExplicitSelection = useSelector(
    selectPerpsHasExplicitDefaultProviderSelection,
  );
  const setDefaultExchange = useSetPerpsDefaultExchange();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_SETTINGS_SCREEN_TYPE,
    },
  });

  const displayedProvider = displayedDefaultExchange(
    defaultProvider,
    hasExplicitSelection,
  );

  const navigateToContactSupport = useCallback(() => {
    openSupportWithConsent(
      (url) =>
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
            title: strings(SUPPORT_CONFIG.TitleKey),
          },
        }),
      SUPPORT_CONFIG.Url,
      () => {
        analytics.trackEvent(
          analytics
            .createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP)
            .build(),
        );
      },
    );
    analytics.trackEvent(
      analytics
        .createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.CONTACT_SUPPORT,
          [PERPS_EVENT_PROPERTY.LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        })
        .build(),
    );
  }, [analytics, navigation, openSupportWithConsent]);

  const handleGiveFeedback = useCallback(() => {
    analytics.trackEvent(
      analytics
        .createEventBuilder(MetaMetricsEvents.PERPS_UI_INTERACTION)
        .addProperties({
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.GIVE_FEEDBACK,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
            PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
        })
        .build(),
    );
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: FEEDBACK_CONFIG.Url,
        title: strings(FEEDBACK_CONFIG.TitleKey),
      },
    });
  }, [analytics, navigation]);

  const openTutorial = useCallback(() => {
    navigation.navigate(Routes.PERPS.TUTORIAL, {
      source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME,
    });
  }, [navigation]);

  const moreItems: PerpsMoreItem[] = useMemo(() => {
    const items: PerpsMoreItem[] = [
      {
        label: strings(SUPPORT_CONFIG.TitleKey),
        startIconName: IconName.Sms,
        onPress: () => navigateToContactSupport(),
        testID: PerpsSettingsViewSelectorsIDs.SUPPORT_BUTTON,
      },
    ];
    if (isFeedbackEnabled) {
      items.push({
        label: strings(FEEDBACK_CONFIG.TitleKey),
        startIconName: IconName.Mail,
        onPress: handleGiveFeedback,
        testID: PerpsSettingsViewSelectorsIDs.FEEDBACK_BUTTON,
      });
    }
    items.push({
      label: strings(LEARN_MORE_CONFIG.TitleKey),
      startIconName: IconName.Book,
      onPress: openTutorial,
      testID: PerpsSettingsViewSelectorsIDs.LEARN_MORE_BUTTON,
    });
    return items;
  }, [
    handleGiveFeedback,
    isFeedbackEnabled,
    navigateToContactSupport,
    openTutorial,
  ]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={tw.style({ paddingTop: insets.top })}
      testID={PerpsSettingsViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isBrandRefresh}
        isFloating={false}
        title={strings('perps.settings.title')}
        onBack={navigation.goBack}
        backButtonProps={{
          testID: PerpsSettingsViewSelectorsIDs.BACK,
        }}
        endAccessory={
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Sm}
            onPress={navigation.goBack}
            testID={PerpsSettingsViewSelectorsIDs.SAVE}
          >
            {strings('perps.settings.save')}
          </Button>
        }
      />
      <ScrollView>
        {isLighterEnabled ? (
          <>
            <SectionHeader title={strings('perps.settings.preferences')} />
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              title={strings('perps.settings.default_exchange')}
              description={PROVIDER_DISPLAY_INFO[displayedProvider].name}
              startAccessory={
                <PerpsProviderLogos
                  providerIds={[displayedProvider]}
                  size={32}
                />
              }
              endAccessory={<Icon name={IconName.ArrowRight} />}
              onPress={() => setIsSheetOpen(true)}
              testID={PerpsSettingsViewSelectorsIDs.DEFAULT_EXCHANGE}
            />
          </>
        ) : null}
        <PerpsMoreSection items={moreItems} />
      </ScrollView>
      {isSheetOpen ? (
        <PerpsDefaultExchangeSheet
          selectedProviderId={displayedProvider}
          onClose={() => setIsSheetOpen(false)}
          onSave={setDefaultExchange}
        />
      ) : null}
    </Box>
  );
};

export default PerpsSettingsView;
