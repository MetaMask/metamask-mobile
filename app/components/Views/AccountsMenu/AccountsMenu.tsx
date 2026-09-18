import React, { useCallback, useMemo } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  HeaderStandard,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextColor,
  TextVariant,
  Text,
  Box,
  BoxJustifyContent,
  ActionListItem,
  AvatarAccount,
  AvatarAccountSize,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { Authentication } from '../../../core/';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useSupportConsent } from '../../hooks/useSupportConsent';
import { useQRScanner } from '../../hooks/useQRScanner';
import { useOrangeMembership } from '../shared/pro/useOrangeMembership';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../selectors/settings';
import { useNativeHeader } from '../../hooks/useNativeHeader';
import { getAvatarAccountVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { useAccountName } from '../../hooks/useAccountName';
import { useAccountGroupName } from '../../hooks/multichainAccounts/useAccountGroupName';
import { selectBalanceBySelectedAccountGroup } from '../../../selectors/assets/balances';
import { useFormatters } from '../../hooks/useFormatters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import {
  getMetamaskNotificationsReadCount,
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';
import { getBetaSupportUrl } from './AccountsMenu.utils';

/*
 * Height of the account platter's leading avatar. The label is boxed to the
 * same height so the two align: ActionListItem top-aligns its start accessory
 * and text (correct when a description is present), which would otherwise
 * leave a label-only row sitting high against the centred trailing content.
 */
const ACCOUNT_PLATTER_AVATAR_SIZE = 40; // AvatarAccountSize.Lg (h-10)

const AccountsMenu = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { openSupportWithConsent } = useSupportConsent();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  const readNotificationCount = useSelector(getMetamaskNotificationsReadCount);

  /*
   * IA EXPERIMENT: the account switcher is now a row *inside* this menu rather
   * than a separate entry point in Home's toolbar. Home's leading chrome opens
   * this menu; this row is what changes account.
   */
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  /*
   * Mirrors Home's toolbar: the *group* name is what reads "Account 1".
   * `useAccountName()` alone returns the internal account name, which is
   * often empty — which is why the label was missing.
   */
  const { openQRScanner } = useQRScanner();

  const accountGroupName = useAccountGroupName();
  const accountName = useAccountName();
  const accountDisplayName = accountGroupName || accountName;

  // Fiat total for the selected account group, shown trailing the label.
  const groupBalance = useSelector(selectBalanceBySelectedAccountGroup()) as {
    totalBalanceInUserCurrency: number;
    userCurrency: string;
  } | null;
  const { formatCurrency } = useFormatters();
  const accountBalanceLabel = groupBalance
    ? formatCurrency(
        groupBalance.totalBalanceInUserCurrency ?? 0,
        groupBalance.userCurrency || 'USD',
      )
    : undefined;

  const { isMember: isOrangeMember, nextPayment } = useOrangeMembership();

  /*
   * Members go to the hub, everyone else to the upsell. Without this a member
   * tapping their own membership row was sold the thing they already have, and
   * the hub was only ever reachable in the moment straight after buying.
   */
  const onPressMetamaskOrange = useCallback(() => {
    navigation.navigate(
      isOrangeMember ? Routes.PRO_HUB.ROOT : Routes.PRO_SUBSCRIPTION.ROOT,
      { source: 'accounts_menu' },
    );
  }, [isOrangeMember, navigation]);

  const onPressAccountSwitcher = useCallback(() => {
    navigation.navigate(Routes.ACCOUNT_HUB_VIEW);
  }, [navigation]);

  const onPressNotifications = useCallback(() => {
    navigation.navigate(Routes.NOTIFICATIONS.VIEW);
    if (isNotificationEnabled && isNotificationsFeatureEnabled()) {
      trackEvent(
        createEventBuilder(EVENT_NAME.NOTIFICATIONS_MENU_OPENED)
          .addProperties({
            unread_count: unreadNotificationCount,
            read_count: readNotificationCount,
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
  ]);
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /*
   * The scanner is the only trailing action, so UIKit already gives it its own
   * glass capsule — a lone item is its own group.
   */
  const headerRightItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'button' as const,
        identifier: 'accounts-menu-scan',
        // Icon-only: the glyph carries it, `accessibilityLabel` names it.
        label: '',
        icon: { type: 'sfSymbol' as const, name: 'qrcode.viewfinder' },
        variant: 'plain' as const,
        accessibilityLabel: strings('accounts_menu.scan'),
        onPress: openQRScanner,
      },
    ],
    [openQRScanner],
  );

  /*
   * This is SettingsFlow's initial route, so native-stack draws no back button
   * for it and the chevron has to be supplied here. Every screen pushed above
   * this one gets the system button instead — and since the bar is configured
   * to show the chevron alone, the two are indistinguishable.
   *
   * Drawing it on this stack rather than on the parent is what keeps the
   * transition continuous: one `UINavigationBar` across the whole flow, so the
   * chevron and title animate between screens instead of the bar being torn
   * down on push and sliding back in from the top on pop.
   */
  const headerLeftItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'button' as const,
        identifier: 'accounts-menu-back',
        // Matches the system back button, which is chevron-only here.
        label: '',
        icon: { type: 'sfSymbol' as const, name: 'chevron.backward' },
        variant: 'plain' as const,
        accessibilityLabel: strings('navigation.back'),
        onPress: handleBack,
      },
    ],
    [handleBack],
  );

  const isNativeHeaderEnabled = useNativeHeader({
    leftItems: headerLeftItems,
    rightItems: headerRightItems,
  });

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

  const onPressNetworks = useCallback(() => {
    navigation.navigate(Routes.SETTINGS.NETWORKS_MANAGEMENT);
  }, [navigation]);

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
    const betaSupportUrl = getBetaSupportUrl();

    if (betaSupportUrl) {
      trackEvent(
        createEventBuilder(EVENT_NAME.NAVIGATION_TAPS_GET_HELP).build(),
      );
      goToBrowserUrl(betaSupportUrl, strings('app_settings.contact_support'));
      return;
    }

    // Defer tracking to when support actually opens (consent confirm/reject),
    // not the mere press that only shows the consent sheet.
    openSupportWithConsent(
      (url) => goToBrowserUrl(url, strings('app_settings.contact_support')),
      METAMASK_SUPPORT_URL,
      () =>
        trackEvent(
          createEventBuilder(EVENT_NAME.NAVIGATION_TAPS_GET_HELP).build(),
        ),
    );
  }, [goToBrowserUrl, trackEvent, createEventBuilder, openSupportWithConsent]);

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

  const isNotificationsEnabled = useMemo(
    () => isNotificationsFeatureEnabled() && isNotificationEnabled,
    [isNotificationEnabled],
  );

  const notificationBadgeCount = useMemo(() => {
    if (unreadNotificationCount > 99) return '99+';
    return unreadNotificationCount.toString();
  }, [unreadNotificationCount]);

  /*
   * The "Upgrade" tag is a call to action, so it goes once there is nothing to
   * upgrade to — leaving it would be selling the member something they hold.
   * A member sees the chevron alone, and the row earns its keep through the
   * sublabel below instead.
   */
  const renderMetamaskOrangeEndAccessory = useMemo(() => {
    if (isOrangeMember) {
      return arrowRightIcon;
    }
    return (
      <Box style={tw.style('flex-row items-center gap-2')}>
        <Tag severity={TagSeverity.Info}>
          {strings('accounts_menu.metamask_orange_badge')}
        </Tag>
        {arrowRightIcon}
      </Box>
    );
  }, [isOrangeMember, tw, arrowRightIcon]);

  /*
   * The next charge, which is the one thing a member is likely to want from an
   * account menu — it is the fact that is otherwise two screens deep, under
   * Manage plan.
   */
  const metamaskOrangeDescription = useMemo(() => {
    if (!isOrangeMember || !nextPayment) {
      return undefined;
    }
    return strings('accounts_menu.metamask_orange_next_payment', {
      amount: nextPayment.amount,
      date: nextPayment.date,
    });
  }, [isOrangeMember, nextPayment]);

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
      {/*
        With the native header on, the back button and the scanner are real
        `UIBarButtonItem`s in the parent's bar (see the `useFocusEffect`
        above), so the JS toolbar would be a second, duplicate one.
      */}
      {!isNativeHeaderEnabled && (
        <HeaderStandard
          onBack={handleBack}
          backButtonProps={{ testID: AccountsMenuSelectorsIDs.BACK_BUTTON }}
          endAccessory={
            /*
              IA EXPERIMENT: QR scan moved out of the Quick Actions block and up
              into this view's own toolbar, so it is chrome rather than a row.
            */
            <ButtonIcon
              iconName={IconName.QrCode}
              size={ButtonIconSize.Md}
              onPress={openQRScanner}
              accessibilityLabel={strings('accounts_menu.scan')}
              testID={AccountsMenuSelectorsIDs.SCAN_BUTTON}
            />
          }
          includesTopInset
        />
      )}
      <ScrollView
        style={tw.style('flex-1', {
          backgroundColor: colors.background.default,
        })}
        /*
         * The transparent bar floats over this ScrollView, so let UIKit apply
         * the nav-bar inset: content starts below the glass but still passes
         * under it on scroll, which is the point. Left alone when the JS
         * header is in use, since that one takes real layout space.
         */
        contentInsetAdjustmentBehavior={
          isNativeHeaderEnabled ? 'automatic' : undefined
        }
        testID={AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID}
      >
        {/*
          IA EXPERIMENT: Quick Actions removed. "Buy" had no purpose here, and
          the QR scanner moved up to Home's toolbar trailing group.
        */}

        {/*
          Account Switcher — its own inset platter so it reads as a distinct
          group. Being inset, it needs no separators around it.
        */}
        {selectedInternalAccount && (
          <Box
            style={tw.style('mx-4 my-2 rounded-2xl overflow-hidden', {
              backgroundColor: colors.background.section,
            })}
          >
            <ActionListItem
              startAccessory={
                <AvatarAccount
                  address={selectedInternalAccount.address}
                  variant={getAvatarAccountVariant(avatarAccountType)}
                  size={AvatarAccountSize.Lg}
                />
              }
              label={
                <Box
                  justifyContent={BoxJustifyContent.Center}
                  style={tw.style({ height: ACCOUNT_PLATTER_AVATAR_SIZE })}
                >
                  <Text variant={TextVariant.BodyMd}>{accountDisplayName}</Text>
                </Box>
              }
              /*
                No chevron here by design — the row is still actionable via
                `onPress`; the balance carries the trailing side alone.
              */
              endAccessory={
                accountBalanceLabel ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {accountBalanceLabel}
                  </Text>
                ) : undefined
              }
              onPress={onPressAccountSwitcher}
              testID={AccountsMenuSelectorsIDs.ACCOUNT_SWITCHER}
            />
          </Box>
        )}

        {separator}

        {/*
          IA EXPERIMENT: opens the Pro subscription benefits flow (PR #35480).
          That view self-dismisses unless the Pro flag is on — see
          MM_PRO_SUBSCRIPTION_FLOW_ENABLED in .js.env.
          Notifications was also moved below MetaMask Card.
        */}
        <ActionListItem
          /*
            `self-center` because ActionListItem hardcodes `alignItems: Start`
            on its leading group, so the icon top-aligns as soon as a
            description makes the text column two lines tall. There is no prop
            to override it — `twClassName` goes to the Pressable — and the
            component centres its *trailing* accessory, so leading and trailing
            disagree. Worth fixing in the design system; this is the local
            workaround until then.
          */
          startAccessory={
            <Box twClassName="self-center">
              <Icon name={IconName.MetamaskFoxOutline} size={IconSize.Lg} />
            </Box>
          }
          label={strings('accounts_menu.metamask_orange')}
          description={metamaskOrangeDescription}
          endAccessory={renderMetamaskOrangeEndAccessory}
          onPress={onPressMetamaskOrange}
          testID={AccountsMenuSelectorsIDs.METAMASK_ORANGE}
        />

        {/* MetaMask Card Row */}
        <ActionListItem
          startAccessory={<Icon name={IconName.Card} size={IconSize.Lg} />}
          label={strings('accounts_menu.card_title')}
          onPress={onPressManageWallet}
          endAccessory={arrowRightIcon}
          testID={AccountsMenuSelectorsIDs.MANAGE_CARD}
        />

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
        <ActionListItem
          startAccessory={
            <Icon name={IconName.SecurityTick} size={IconSize.Lg} />
          }
          label={strings('accounts_menu.permissions')}
          endAccessory={arrowRightIcon}
          onPress={onPressPermissions}
          testID={AccountsMenuSelectorsIDs.PERMISSIONS}
        />

        {/* Networks Row */}
        <ActionListItem
          startAccessory={<Icon name={IconName.Hierarchy} size={IconSize.Lg} />}
          label={strings('accounts_menu.networks')}
          endAccessory={arrowRightIcon}
          onPress={onPressNetworks}
          testID={AccountsMenuSelectorsIDs.NETWORKS}
        />

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
          startAccessory={<Icon name={IconName.Sms} size={IconSize.Lg} />}
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
