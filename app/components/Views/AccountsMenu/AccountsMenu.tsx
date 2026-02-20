import React, { useCallback, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import MainActionButton from '../../../component-library/components-temp/MainActionButton';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard/HeaderCompactStandard';
import ActionListItem from '../../../component-library/components-temp/ActionListItem';
import { IconName as LocalIconName } from '../../../component-library/components/Icons/Icon';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { Authentication } from '../../../core/';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { selectDisplayCardButton } from '../../../core/redux/slices/card';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import { isPermissionsSettingsV1Enabled } from '../../../util/networks';
import useRampsUnifiedV1Enabled from '../../UI/Ramp/hooks/useRampsUnifiedV1Enabled';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../../UI/Ramp/hooks/useRampsButtonClickData';
import { WalletViewSelectorsIDs } from '../Wallet/WalletView.testIds';
import { useRampNavigation } from '../../UI/Ramp/hooks/useRampNavigation';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import {
  getMetamaskNotificationsReadCount,
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectIsBackupAndSyncEnabled } from '../../../selectors/identity';

const AccountsMenu = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const shouldDisplayCardButton = useSelector(selectDisplayCardButton);
  const { goToBuy } = useRampNavigation();
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  const rampsButtonClickData = useRampsButtonClickData();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  const readNotificationCount = useSelector(getMetamaskNotificationsReadCount);
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const onPressDeposit = useCallback(() => {
    trackEvent(
      createEventBuilder(EVENT_NAME.RAMPS_BUTTON_CLICKED)
        .addProperties({
          text: 'Buy',
          location: 'AccountsMenu',
          ramp_type: 'UNIFIED_BUY',
          chain_id_destination: null,
          region: rampGeodetectedRegion ?? null,
          ramp_routing: rampsButtonClickData.ramp_routing ?? null,
          is_authenticated: rampsButtonClickData.is_authenticated ?? null,
          preferred_provider: rampsButtonClickData.preferred_provider ?? null,
          order_count: rampsButtonClickData.order_count,
        })
        .build(),
    );
    goToBuy();
  }, [
    goToBuy,
    createEventBuilder,
    trackEvent,
    rampGeodetectedRegion,
    rampsButtonClickData,
  ]);

  const onPressNotifications = useCallback(() => {
    if (isNotificationEnabled && isNotificationsFeatureEnabled()) {
      navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      trackEvent(
        createEventBuilder(EVENT_NAME.NOTIFICATIONS_MENU_OPENED)
          .addProperties({
            unread_count: unreadNotificationCount,
            read_count: readNotificationCount,
          })
          .build(),
      );
    } else {
      navigation.navigate(Routes.NOTIFICATIONS.OPT_IN_STACK);
      trackEvent(
        createEventBuilder(EVENT_NAME.NOTIFICATIONS_ACTIVATED)
          .addProperties({
            action_type: 'started',
            is_profile_syncing_enabled: isBackupAndSyncEnabled,
          })
          .build(),
      );
    }
  }, [
    isNotificationEnabled,
    navigation,
    trackEvent,
    createEventBuilder,
    unreadNotificationCount,
    readNotificationCount,
    isBackupAndSyncEnabled,
  ]);

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
      createEventBuilder(EVENT_NAME.NAVIGATION_TAPS_SEND_FEEDBACK).build(),
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
    trackEvent(createEventBuilder(EVENT_NAME.NAVIGATION_TAPS_GET_HELP).build());
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
              createEventBuilder(EVENT_NAME.NAVIGATION_TAPS_LOGOUT).build(),
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
        style={tw.style('h-px my-2 mx-4', {
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

  const onScanSuccess = useCallback(
    (data: { private_key?: string; seed?: string }, content: string) => {
      if (data.private_key) {
        const privateKey = data.private_key;
        Alert.alert(
          strings('wallet.private_key_detected'),
          strings('wallet.do_you_want_to_import_this_account'),
          [
            {
              text: strings('wallet.cancel'),
              onPress: () => false,
              style: 'cancel',
            },
            {
              text: strings('wallet.yes'),
              onPress: async () => {
                try {
                  await Authentication.importAccountFromPrivateKey(privateKey);
                  navigation.navigate('ImportPrivateKeyView', {
                    screen: 'ImportPrivateKeySuccess',
                  });
                } catch {
                  Alert.alert(
                    strings('import_private_key.error_title'),
                    strings('import_private_key.error_message'),
                  );
                }
              },
            },
          ],
          { cancelable: false },
        );
      } else if (data.seed) {
        Alert.alert(
          strings('wallet.error'),
          strings('wallet.logout_to_import_seed'),
        );
      } else {
        setTimeout(() => {
          DeeplinkManager.parse(content, {
            origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
          });
        }, 500);
      }
    },
    [navigation],
  );

  const openQRScanner = useCallback(() => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      onScanSuccess,
    });
    trackEvent(createEventBuilder(EVENT_NAME.QR_SCANNER_OPENED).build());
  }, [navigation, onScanSuccess, trackEvent, createEventBuilder]);

  const isNotificationsEnabled = useMemo(
    () => isNotificationsFeatureEnabled() && isNotificationEnabled,
    [isNotificationEnabled],
  );

  const notificationBadgeCount = useMemo(() => {
    if (unreadNotificationCount > 99) return '99+';
    return unreadNotificationCount.toString();
  }, [unreadNotificationCount]);

  const renderNotificationsEndAccessory = useMemo(() => {
    if (isNotificationsEnabled && unreadNotificationCount > 0) {
      return (
        <Box style={tw.style('flex-row items-center gap-2')}>
          <Box
            style={tw.style(
              'rounded-lg px-2 py-0.5 min-w-6 items-center justify-center',
              {
                backgroundColor: colors.error.default,
              },
            )}
          >
            <Text
              style={tw.style('font-medium')}
              variant={TextVariant.BodyXs}
              color={TextColor.PrimaryInverse}
            >
              {notificationBadgeCount}
            </Text>
          </Box>
          {arrowRightIcon}
        </Box>
      );
    }
    return arrowRightIcon;
  }, [
    isNotificationsEnabled,
    unreadNotificationCount,
    notificationBadgeCount,
    arrowRightIcon,
    colors.error.default,
    tw,
  ]);

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
        {/* Quick Actions Section */}
        <Box style={tw.style('px-4 py-3 flex-row gap-4 justify-between')}>
          {rampUnifiedV1Enabled && (
            <Box style={tw.style('mb-2 flex-1')}>
              <MainActionButton
                iconName={LocalIconName.AttachMoney}
                label={strings('accounts_menu.buy')}
                onPress={onPressDeposit}
                testID={AccountsMenuSelectorsIDs.BUY_BUTTON}
              />
            </Box>
          )}
          <Box style={tw.style('mb-2 flex-1')}>
            <MainActionButton
              iconName={LocalIconName.QrCode}
              label={strings('accounts_menu.scan')}
              onPress={openQRScanner}
              testID={WalletViewSelectorsIDs.WALLET_SCAN_BUTTON}
            />
          </Box>
        </Box>

        {/* Notifications Row */}
        {isNotificationsFeatureEnabled() && (
          <ActionListItem
            startAccessory={
              <Icon name={IconName.Notification} size={IconSize.Lg} />
            }
            label={strings('accounts_menu.notifications')}
            endAccessory={renderNotificationsEndAccessory}
            onPress={onPressNotifications}
            testID={AccountsMenuSelectorsIDs.NOTIFICATIONS_BUTTON}
          />
        )}

        {/* MetaMask Card Row */}
        {shouldDisplayCardButton && (
          <ActionListItem
            startAccessory={<Icon name={IconName.Card} size={IconSize.Lg} />}
            label={strings('accounts_menu.card_title')}
            onPress={onPressManageWallet}
            endAccessory={arrowRightIcon}
            testID={AccountsMenuSelectorsIDs.MANAGE_CARD}
          />
        )}

        {separator}

        {/* Manage Section */}
        <Box style={tw.style('px-4 py-3')}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
          label={strings('accounts_menu.log_out')}
          labelTextProps={{ color: TextColor.ErrorDefault }}
          onPress={onPressLogOut}
          testID={AccountsMenuSelectorsIDs.LOCK}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountsMenu;
