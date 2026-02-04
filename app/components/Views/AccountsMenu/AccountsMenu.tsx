import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import MainActionButton from '../../../component-library/components-temp/MainActionButton';
import ActionListItem from '../../../component-library/components-temp/ActionListItem';
import LocalIcon, {
  IconName as LocalIconName,
} from '../../../component-library/components/Icons/Icon';
import { Icon, IconName } from '@metamask/design-system-react-native';
import { useRampNavigation } from '../../UI/Ramp/hooks/useRampNavigation';
import Routes from '../../../constants/navigation/Routes';
import { selectDisplayCardButton } from '../../../core/redux/slices/card';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { Authentication } from '../../../core/';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { EVENT_LOCATIONS } from '../../UI/Stake/constants/events';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import { EARN_INPUT_VIEW_ACTIONS } from '../../UI/Earn/Views/EarnInputView/EarnInputView.types';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../../UI/Ramp/hooks/useRampsButtonClickData';
import useRampsUnifiedV1Enabled from '../../UI/Ramp/hooks/useRampsUnifiedV1Enabled';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    },
    quickActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 16,
    },
    buttonWrapper: {
      flex: 1,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border.muted,
      marginVertical: 16,
    },
  });

const AccountsMenu = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { goToBuy } = useRampNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const shouldDisplayCardButton = useSelector(selectDisplayCardButton);
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);
  const rampsButtonClickData = useRampsButtonClickData();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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

  const onPressEarn = useCallback(() => {
    navigation.navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
      params: {
        tokenFilter: {
          includeNativeTokens: true,
          includeStakingTokens: false,
          includeLendingTokens: true,
          includeReceiptTokens: false,
        },
        onItemPressScreen: EARN_INPUT_VIEW_ACTIONS.DEPOSIT,
      },
    });
    trackEvent(
      createEventBuilder(EVENT_NAME.EARN_BUTTON_CLICKED)
        .addProperties({
          text: 'Earn',
          location: EVENT_LOCATIONS.ACCOUNTS_MENU,
        })
        .build(),
    );
  }, [createEventBuilder, navigation, trackEvent]);

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

  const onPressScan = useCallback(() => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      onScanSuccess,
    });
    trackEvent(createEventBuilder(EVENT_NAME.QR_SCANNER_OPENED).build());
  }, [navigation, onScanSuccess, trackEvent, createEventBuilder]);

  const onPressSettings = useCallback(() => {
    trackEvent(createEventBuilder(EVENT_NAME.SETTINGS_VIEWED).build());
    navigation.navigate(Routes.SETTINGS.ROOT);
  }, [navigation, trackEvent, createEventBuilder]);

  const onPressContacts = useCallback(() => {
    // TODO: Add analytics tracking - There isn't an event for this yet. Will ask if we need to create one.
    navigation.navigate(Routes.SETTINGS.CONTACTS);
  }, [navigation]);

  const onPressManageWallet = useCallback(() => {
    trackEvent(createEventBuilder(EVENT_NAME.CARD_HOME_CLICKED).build());
    navigation.navigate(Routes.CARD.ROOT);
  }, [createEventBuilder, navigation, trackEvent]);

  const onPressPermissions = useCallback(() => {
    // TODO: Add analytics tracking - There isn't an event for this yet. Will ask if we need to create one.
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
    // TODO: Add analytics tracking - There isn't an event for this yet. Will ask if we need to create one.
    goToBrowserUrl(
      'https://community.metamask.io/c/feature-requests-ideas/',
      strings('app_settings.request_feature'),
    );
  }, [goToBrowserUrl]);

  const onPressSupport = useCallback(() => {
    // TODO: Add analytics tracking - There isn't an event for this yet. Will ask if we need to create one.
    const supportUrl = 'https://support.metamask.io';
    goToBrowserUrl(supportUrl, strings('app_settings.contact_support'));
  }, [goToBrowserUrl]);

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
          onPress: onPressLock,
        },
      ],
      { cancelable: false },
    );
    // TODO: Add analytics tracking - There isn't an event for this yet. Will ask if we need to create one.
  }, [onPressLock]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderCenter
        onBack={handleBack}
        backButtonProps={{ testID: AccountsMenuSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        style={styles.wrapper}
        testID={AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID}
      >
        {/* Quick Actions Section */}
        <View style={styles.quickActionsContainer}>
          {rampUnifiedV1Enabled && (
            <View style={styles.buttonWrapper}>
              <MainActionButton
                iconName={LocalIconName.Download}
                label="Deposit"
                onPress={onPressDeposit}
                testID={AccountsMenuSelectorsIDs.DEPOSIT_BUTTON}
              />
            </View>
          )}
          <View style={styles.buttonWrapper}>
            <MainActionButton
              iconName={LocalIconName.Stake}
              label="Earn"
              onPress={onPressEarn}
              testID={AccountsMenuSelectorsIDs.EARN_BUTTON}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <MainActionButton
              iconName={LocalIconName.QrCode}
              label="Scan"
              onPress={onPressScan}
              testID={AccountsMenuSelectorsIDs.SCAN_BUTTON}
            />
          </View>
        </View>

        {/* Settings Row */}
        <ActionListItem
          iconName={IconName.Setting}
          label="Settings"
          endAccessory={<Icon name={IconName.ArrowRight} />}
          onPress={onPressSettings}
          testID={AccountsMenuSelectorsIDs.SETTINGS}
        />

        {/* Separator */}
        <View style={styles.separator} />

        {/* Manage Section */}
        <View style={styles.sectionHeader}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            MANAGE
          </Text>
        </View>

        {/* Contacts Row */}
        <ActionListItem
          startAccessory={<LocalIcon name={LocalIconName.Bookmark} />}
          label="Contacts"
          endAccessory={<Icon name={IconName.ArrowRight} />}
          onPress={onPressContacts}
          testID={AccountsMenuSelectorsIDs.CONTACTS}
        />

        {/* MetaMask Card Row */}
        {shouldDisplayCardButton && (
          <ActionListItem
            startAccessory={<LocalIcon name={LocalIconName.Card} />}
            label="MetaMask Card"
            onPress={onPressManageWallet}
            endAccessory={<Icon name={IconName.ArrowRight} />}
            testID={AccountsMenuSelectorsIDs.MANAGE_WALLET}
          />
        )}

        {/* Permissions Row */}
        <ActionListItem
          startAccessory={<LocalIcon name={LocalIconName.SecurityTick} />}
          label="Permissions"
          endAccessory={<Icon name={IconName.ArrowRight} />}
          onPress={onPressPermissions}
          testID={AccountsMenuSelectorsIDs.PERMISSIONS}
        />

        {/* TODO: Add Networks row */}

        {/* Resources Section */}
        <View style={styles.sectionHeader}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            RESOURCES
          </Text>
        </View>

        {/* About MetaMask Row */}
        <ActionListItem
          startAccessory={<LocalIcon name={LocalIconName.Info} />}
          label="About MetaMask"
          endAccessory={<Icon name={IconName.ArrowRight} />}
          onPress={onPressAboutMetaMask}
          testID={AccountsMenuSelectorsIDs.ABOUT_METAMASK}
        />

        {/* Request a Feature Row */}
        <ActionListItem
          startAccessory={<LocalIcon name={LocalIconName.Details} />}
          label="Request a feature"
          onPress={onPressRequestFeature}
          testID={AccountsMenuSelectorsIDs.REQUEST_FEATURE}
        />

        {/* Support Row */}
        <ActionListItem
          startAccessory={<LocalIcon name={LocalIconName.MessageQuestion} />}
          label="Support"
          onPress={onPressSupport}
          testID={AccountsMenuSelectorsIDs.SUPPORT}
        />

        {/* Separator */}
        <View style={styles.separator} />

        {/* Log Out Row */}
        <ActionListItem
          startAccessory={<LocalIcon name={LocalIconName.Lock} />}
          label="Log Out"
          onPress={onPressLogOut}
          testID={AccountsMenuSelectorsIDs.LOCK}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountsMenu;
