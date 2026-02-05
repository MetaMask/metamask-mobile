import React, { useCallback, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import {
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextColor,
  TextVariant,
  Text,
  Box,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard/HeaderCompactStandard';
import ActionListItem from '../../../component-library/components-temp/ActionListItem';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { Authentication } from '../../../core/';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { selectDisplayCardButton } from '../../../core/redux/slices/card';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import { isPermissionsSettingsV1Enabled } from '../../../util/networks';

const AccountsMenu = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const shouldDisplayCardButton = useSelector(selectDisplayCardButton);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onPressSettings = useCallback(() => {
    trackEvent(createEventBuilder(EVENT_NAME.SETTINGS_VIEWED).build());
    navigation.navigate(Routes.SETTINGS.ROOT);
  }, [navigation, trackEvent, createEventBuilder]);

  const onPressContacts = useCallback(() => {
    // TODO: Will add events in follow up PR
    navigation.navigate(Routes.SETTINGS.CONTACTS);
  }, [navigation]);

  const onPressManageWallet = useCallback(() => {
    trackEvent(createEventBuilder(EVENT_NAME.CARD_HOME_CLICKED).build());
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation, trackEvent, createEventBuilder]);

  const onPressPermissions = useCallback(() => {
    // TODO: Will add events in follow up PR
    navigation.navigate(Routes.SETTINGS.SDK_SESSIONS_MANAGER);
  }, [navigation]);

  const goToBrowserUrl = useCallback(
    (url: string, title: string) => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url,
          title,
        },
      });
    },
    [navigation],
  );

  const onPressAboutMetaMask = useCallback(() => {
    trackEvent(createEventBuilder(EVENT_NAME.SETTINGS_ABOUT).build());
    navigation.navigate(Routes.SETTINGS.COMPANY);
  }, [navigation, trackEvent, createEventBuilder]);

  const onPressRequestFeature = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.NAVIGATION_TAPS_SEND_FEEDBACK,
      ).build(),
    );
    goToBrowserUrl(
      'https://community.metamask.io/c/feature-requests-ideas/',
      strings('app_settings.request_feature'),
    );
  }, [goToBrowserUrl, trackEvent, createEventBuilder]);

  const onPressSupport = useCallback(() => {
    let supportUrl = 'https://support.metamask.io';

    ///: BEGIN:ONLY_INCLUDE_IF(beta)
    supportUrl = 'https://intercom.help/internal-beta-testing/en/';
    ///: END:ONLY_INCLUDE_IF

    goToBrowserUrl(supportUrl, strings('app_settings.contact_support'));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP).build(),
    );
  }, [goToBrowserUrl, trackEvent, createEventBuilder]);

  const onPressLock = useCallback(async () => {
    await Authentication.lockApp({ reset: false, locked: false });
  }, []);

  const onPressLogOut = useCallback(() => {
    Alert.alert(
      strings('drawer.lock_title'),
      '',
      [
        {
          text: strings('drawer.lock_cancel'),
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: strings('drawer.lock_ok'),
          onPress: async () => {
            trackEvent(
              createEventBuilder(
                MetaMetricsEvents.NAVIGATION_TAPS_LOGOUT,
              ).build(),
            );
            await onPressLock();
          },
        },
      ],
      { cancelable: false },
    );
  }, [onPressLock, trackEvent, createEventBuilder]);

  const separator = useMemo(
    () => (
      <Box
        style={tw.style('h-px my-2', {
          backgroundColor: colors.border.muted,
          opacity: 0.75,
        })}
      />
    ),

    [colors.border.muted, tw],
  );

  const arrowRightIcon = useMemo(
    () => (
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    ),
    [],
  );

  const aboutMetaMaskTitle = useMemo(() => {
    let title = strings('app_settings.info_title');

    ///: BEGIN:ONLY_INCLUDE_IF(flask)
    title = strings('app_settings.info_title_flask');
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(beta)
    title = strings('app_settings.info_title_beta');
    ///: END:ONLY_INCLUDE_IF

    return title;
  }, []);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1', { backgroundColor: colors.background.default })}
    >
      <HeaderCompactStandard
        onBack={handleBack}
        backButtonProps={{ testID: AccountsMenuSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        style={tw.style('flex-1', {
          backgroundColor: colors.background.default,
        })}
        testID={AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID}
      >
        {/* Manage Section */}
        <Box style={tw.style('px-4 py-3')}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('accounts_menu.manage')}
          </Text>
        </Box>

        {/* Settings Row */}
        <ActionListItem
          startAccessory={<Icon name={IconName.Setting} size={IconSize.Lg} />}
          label={strings('accounts_menu.settings')}
          endAccessory={arrowRightIcon}
          onPress={onPressSettings}
          testID={AccountsMenuSelectorsIDs.SETTINGS}
        />

        {/* Contacts Row */}
        <ActionListItem
          startAccessory={<Icon name={IconName.Bookmark} size={IconSize.Lg} />}
          label={strings('send.contacts')}
          endAccessory={arrowRightIcon}
          onPress={onPressContacts}
          testID={AccountsMenuSelectorsIDs.CONTACTS}
        />

        {/* MetaMask Card Row */}
        {shouldDisplayCardButton && (
          <ActionListItem
            startAccessory={<Icon name={IconName.Card} size={IconSize.Lg} />}
            label={strings('accounts_menu.card_title')}
            onPress={onPressManageWallet}
            endAccessory={arrowRightIcon}
            testID={AccountsMenuSelectorsIDs.MANAGE_WALLET}
          />
        )}

        {/* Permissions Row */}
        {isPermissionsSettingsV1Enabled && (
          <ActionListItem
            startAccessory={
              <Icon name={IconName.SecurityTick} size={IconSize.Lg} />
            }
            label={strings('accounts_menu.permissions')}
            endAccessory={arrowRightIcon}
            onPress={onPressPermissions}
            testID={AccountsMenuSelectorsIDs.PERMISSIONS}
          />
        )}

        {separator}

        {/* Resources Section */}
        <Box style={tw.style('px-4 py-3')}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('accounts_menu.resources')}
          </Text>
        </Box>

        {/* About MetaMask Row */}
        <ActionListItem
          startAccessory={<Icon name={IconName.Info} size={IconSize.Lg} />}
          label={aboutMetaMaskTitle}
          endAccessory={arrowRightIcon}
          onPress={onPressAboutMetaMask}
          testID={AccountsMenuSelectorsIDs.ABOUT_METAMASK}
        />

        {/* Request a Feature Row */}
        <ActionListItem
          startAccessory={<Icon name={IconName.Details} size={IconSize.Lg} />}
          label={strings('app_settings.request_feature')}
          onPress={onPressRequestFeature}
          testID={AccountsMenuSelectorsIDs.REQUEST_FEATURE}
        />

        {/* Support Row */}
        <ActionListItem
          startAccessory={
            <Icon name={IconName.MessageQuestion} size={IconSize.Lg} />
          }
          label={strings('app_settings.contact_support')}
          onPress={onPressSupport}
          testID={AccountsMenuSelectorsIDs.SUPPORT}
        />

        {separator}

        {/* Log Out Row */}
        <ActionListItem
          startAccessory={
            <Icon
              name={IconName.Lock}
              size={IconSize.Lg}
              color={IconColor.ErrorDefault}
            />
          }
          label={strings('drawer.lock')}
          labelTextProps={{ color: TextColor.ErrorDefault }}
          onPress={onPressLogOut}
          testID={AccountsMenuSelectorsIDs.LOCK}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountsMenu;
