import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { Authentication } from '../../../core/';
import { strings } from '../../../../locales/i18n';

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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { goToBuy } = useRampNavigation();
  const shouldDisplayCardButton = useSelector(selectDisplayCardButton);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onPressDeposit = useCallback(() => {
    // TODO: Add analytics tracking
    goToBuy();
  }, [goToBuy]);

  const onPressEarn = useCallback(() => {
    // TODO: Add analytics tracking
    navigation.navigate(Routes.EARN.ROOT);
  }, [navigation]);

  const onPressScan = useCallback(() => {
    // TODO: Add analytics tracking
    navigation.navigate(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
    );
  }, [navigation]);

  const onPressSettings = useCallback(() => {
    // TODO: Add analytics tracking
    navigation.navigate('Settings');
  }, [navigation]);

  const onPressContacts = useCallback(() => {
    // TODO: Add analytics tracking
    navigation.navigate('ContactsSettings');
  }, [navigation]);

  const onPressManageWallet = useCallback(() => {
    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CARD_HOME_CLICKED,
      ).build(),
    );
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const onPressPermissions = useCallback(() => {
    // TODO: Add analytics tracking
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
    // TODO: Add analytics tracking
    navigation.navigate('CompanySettings');
  }, [navigation]);

  const onPressRequestFeature = useCallback(() => {
    // TODO: Add analytics tracking
    goToBrowserUrl(
      'https://community.metamask.io/c/feature-requests-ideas/',
      strings('app_settings.request_feature'),
    );
  }, [goToBrowserUrl]);

  const onPressSupport = useCallback(() => {
    // TODO: Add analytics tracking
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
    // TODO: Add analytics tracking
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
          <View style={styles.buttonWrapper}>
            <MainActionButton
              iconName={LocalIconName.Download}
              label="Deposit"
              onPress={onPressDeposit}
              testID={AccountsMenuSelectorsIDs.DEPOSIT_BUTTON}
            />
          </View>
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
