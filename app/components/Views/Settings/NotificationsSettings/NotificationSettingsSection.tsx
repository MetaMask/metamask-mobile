import {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
import React from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useNotificationStoragePreferences,
  type NotificationStoragePreferenceType,
} from './hooks/useNotificationStoragePreferences';
import { AccountsList } from './AccountsList';
import { strings } from '../../../../../locales/i18n';

type NotificationSettingsStyles = ReturnType<typeof styleSheet>;

interface SectionContentProps {
  styles: NotificationSettingsStyles;
}

const WalletActivitySectionContent = ({ styles }: SectionContentProps) => (
  <>
    <View style={styles.line} />
    <View style={styles.setting}>
      <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
        {strings('app_settings.notifications_opts.select_accounts_title')}
      </Text>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {strings('app_settings.notifications_opts.select_accounts_desc')}
      </Text>
    </View>
    <AccountsList />
  </>
);

const SECTION_CONTENT_BY_TYPE: Partial<
  Record<
    NotificationStoragePreferenceType,
    React.ComponentType<SectionContentProps>
  >
> = {
  walletActivity: WalletActivitySectionContent,
};

export interface NotificationSettingsSectionProps {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<
    {
      params: {
        type: NotificationStoragePreferenceType;
        title: string;
        description: string;
      };
    },
    'params'
  >;
}

const NotificationSettingsSection = ({
  navigation,
  route,
}: NotificationSettingsSectionProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { type, title, description } = route.params;

  const { preferences, updatePreference } = useNotificationStoragePreferences();

  if (!preferences) {
    return null;
  }

  const sectionPrefs = preferences[type];
  const SectionContent = SECTION_CONTENT_BY_TYPE[type];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <HeaderCompactStandard title={title} onBack={() => navigation.goBack()} />
      <ScrollView style={styles.container}>
        <View style={styles.setting}>
          <Text color={TextColor.TextDefault} variant={TextVariant.HeadingLg}>
            {strings('app_settings.notifications_opts.preferences_title')}
          </Text>
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
            {description}
          </Text>
        </View>

        <View style={styles.switchElement}>
          <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
            {strings('app_settings.notifications_opts.push_recommended')}
          </Text>
          <Switch
            value={sectionPrefs.pushNotificationsEnabled}
            onChange={() =>
              updatePreference(
                type,
                'pushNotificationsEnabled',
                !sectionPrefs.pushNotificationsEnabled,
              )
            }
            trackColor={{
              true: theme.colors.primary.default,
              false: theme.colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={theme.colors.border.muted}
          />
        </View>

        <View style={styles.switchElement}>
          <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
            {strings('app_settings.notifications_opts.in_app')}
          </Text>
          <Switch
            value={sectionPrefs.inAppNotificationsEnabled}
            onChange={() =>
              updatePreference(
                type,
                'inAppNotificationsEnabled',
                !sectionPrefs.inAppNotificationsEnabled,
              )
            }
            trackColor={{
              true: theme.colors.primary.default,
              false: theme.colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={theme.colors.border.muted}
          />
        </View>

        {SectionContent ? <SectionContent styles={styles} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsSection;
