import React, { useCallback, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { Colors } from '../../../util/theme/models';
import { SettingsViewSelectorsIDs } from './SettingsView.testIds';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { isTestEnvironment } from '../../../util/test/utils';
import { getMetamaskNotificationsUnreadCount } from '../../../selectors/notifications';

interface SettingsItem {
  id: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    headerControls: {
      height: 48,
      paddingHorizontal: 8,
      justifyContent: 'space-between',
    },
    title: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 16,
    },
    searchInput: {
      height: 44,
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      color: colors.text.default,
      backgroundColor: colors.background.muted,
      fontSize: 16,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    section: {
      paddingTop: 18,
    },
    sectionTitle: {
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    row: {
      minHeight: 50,
      paddingHorizontal: 18,
      gap: 14,
    },
    rowIcon: {
      width: 20,
    },
    rowLabel: {
      flex: 1,
    },
    endAccessory: {
      gap: 10,
    },
    badge: {
      minWidth: 24,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 7,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.error.default,
    },
  });

const Settings = () => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const styles = createStyles(colors);
  const navigation = useNavigation<AppNavigationProp>();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onPressGeneral = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_GENERAL).build());
    navigation.navigate('GeneralSettings');
  };

  const onPressAdvanced = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_ADVANCED).build());
    navigation.navigate('AdvancedSettings');
  };

  const onPressNotifications = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_NOTIFICATIONS).build(),
    );
    navigation.navigate(Routes.SETTINGS.NOTIFICATIONS);
  };

  const onPressBackupAndSync = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_BACKUP_AND_SYNC).build(),
    );
    navigation.navigate(Routes.SETTINGS.BACKUP_AND_SYNC);
  };

  const onPressSecurity = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SETTINGS_SECURITY_AND_PRIVACY,
      ).build(),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.VIEW_SECURITY_SETTINGS).build(),
    );
    navigation.navigate('SecuritySettings');
  };

  const onPressPrivacy = () => {
    navigation.navigate('PrivacySettings');
  };

  const onPressAssets = () => {
    navigation.navigate('AssetsSettingsView');
  };

  const onPressBrowser = () => {
    navigation.navigate('BrowserSettings');
  };

  const onPressOnRamp = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONRAMP_SETTINGS_CLICKED).build(),
    );
    navigation.navigate(Routes.RAMP.SETTINGS);
  };

  const onPressExperimental = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_EXPERIMENTAL).build(),
    );
    navigation.navigate('ExperimentalSettings');
  };

  const onPressAesCryptoTestForm = () => {
    navigation.navigate('AesCryptoTestForm');
  };

  const onPressDeveloperOptions = () => {
    navigation.navigate('DeveloperOptions');
  };
  const onPressFeatureFlagOverride = () => {
    navigation.navigate(Routes.FEATURE_FLAG_OVERRIDE);
  };

  const onPressDeveloperFeatures = () => {
    if (process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true') {
      onPressDeveloperOptions();
      return;
    }
    if (process.env.METAMASK_ENVIRONMENT !== 'production') {
      onPressFeatureFlagOverride();
      return;
    }
    onPressAdvanced();
  };

  const sections: SettingsSection[] = [
    {
      title: strings('app_settings.sections.general'),
      items: [
        {
          id: SettingsViewSelectorsIDs.GENERAL,
          icon: IconName.Setting,
          label: strings('app_settings.entries.preferences_display'),
          onPress: onPressGeneral,
        },
        ...(isNotificationsFeatureEnabled()
          ? [
              {
                id: SettingsViewSelectorsIDs.NOTIFICATIONS,
                icon: IconName.Notification,
                label: strings('app_settings.notifications_title'),
                onPress: onPressNotifications,
                badge:
                  unreadNotificationCount > 0
                    ? unreadNotificationCount > 99
                      ? '99+'
                      : unreadNotificationCount.toString()
                    : undefined,
              },
            ]
          : []),
      ],
    },
    {
      title: strings('app_settings.sections.security_privacy'),
      items: [
        {
          id: SettingsViewSelectorsIDs.SECURITY,
          icon: IconName.SecurityTick,
          label: strings('app_settings.entries.security_password'),
          onPress: onPressSecurity,
        },
        {
          id: SettingsViewSelectorsIDs.PRIVACY,
          icon: IconName.Lock,
          label: strings('app_settings.entries.privacy'),
          onPress: onPressPrivacy,
        },
        {
          id: SettingsViewSelectorsIDs.BACKUP_AND_SYNC,
          icon: IconName.Key,
          label: strings('backupAndSync.title'),
          onPress: onPressBackupAndSync,
        },
      ],
    },
    {
      title: strings('app_settings.sections.transactions_assets'),
      items: [
        {
          id: SettingsViewSelectorsIDs.ADVANCED,
          icon: IconName.Coin,
          label: strings('app_settings.entries.assets'),
          onPress: onPressAssets,
        },
        {
          id: SettingsViewSelectorsIDs.TRANSACTIONS,
          icon: IconName.SwapVertical,
          label: strings('app_settings.entries.transactions'),
          onPress: onPressAdvanced,
        },
        {
          id: SettingsViewSelectorsIDs.BROWSER,
          icon: IconName.Global,
          label: strings('app_settings.entries.browser'),
          onPress: onPressBrowser,
        },
        {
          id: SettingsViewSelectorsIDs.ON_RAMP,
          icon: IconName.BuySell,
          label: strings('app_settings.entries.buy_sell'),
          onPress: onPressOnRamp,
        },
      ],
    },
    {
      title: strings('app_settings.sections.more'),
      items: [
        {
          id: SettingsViewSelectorsIDs.EXPERIMENTAL,
          icon: IconName.Data,
          label: strings('app_settings.experimental_title'),
          onPress: onPressExperimental,
        },
        {
          id: SettingsViewSelectorsIDs.DEVELOPER_FEATURES,
          icon: IconName.Code,
          label: strings('app_settings.entries.developer_features'),
          onPress: onPressDeveloperFeatures,
        },
      ],
    },
  ];

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleSections = normalizedQuery
    ? sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            item.label.toLocaleLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter((section) => section.items.length > 0)
    : sections;
  return (
    <SafeAreaView style={styles.wrapper}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        style={styles.headerControls}
        testID={SettingsViewSelectorsIDs.SETTINGS_HEADER}
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          accessibilityLabel={strings('app_settings.back')}
          testID={SettingsViewSelectorsIDs.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={isSearching ? IconName.X : IconName.Search}
          size={ButtonIconSize.Md}
          onPress={() => {
            setIsSearching((current) => !current);
            setSearchQuery('');
          }}
          accessibilityLabel={strings('app_settings.search')}
          testID={SettingsViewSelectorsIDs.SEARCH_BUTTON}
        />
      </Box>
      {isSearching ? (
        <TextInput
          autoFocus
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={strings('app_settings.search_placeholder')}
          placeholderTextColor={colors.text.alternative}
          style={styles.searchInput}
          testID={SettingsViewSelectorsIDs.SEARCH_INPUT}
        />
      ) : (
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          style={styles.title}
        >
          {strings('app_settings.title')}
        </Text>
      )}
      <ScrollView
        style={styles.wrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID={SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID}
      >
        {visibleSections.map((section) => (
          <Box key={section.title} style={styles.section}>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              style={styles.sectionTitle}
            >
              {section.title}
            </Text>
            {section.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={item.onPress}
                accessibilityRole="button"
                testID={item.id}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  style={styles.row}
                >
                  <Box style={styles.rowIcon}>
                    <Icon
                      name={item.icon}
                      size={IconSize.Md}
                      color={IconColor.IconAlternative}
                    />
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    style={styles.rowLabel}
                  >
                    {item.label}
                  </Text>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    style={styles.endAccessory}
                  >
                    {item.badge && (
                      <Box style={styles.badge}>
                        <Text
                          variant={TextVariant.BodySm}
                          fontWeight={FontWeight.Medium}
                          color={TextColor.TextDefault}
                        >
                          {item.badge}
                        </Text>
                      </Box>
                    )}
                    <Icon
                      name={IconName.ArrowRight}
                      size={IconSize.Sm}
                      color={IconColor.IconAlternative}
                    />
                  </Box>
                </Box>
              </Pressable>
            ))}
          </Box>
        ))}
        {isTestEnvironment && (
          <Pressable
            onPress={onPressAesCryptoTestForm}
            testID={SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM}
          >
            <Text>{strings('app_settings.aes_crypto_test_form_title')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
