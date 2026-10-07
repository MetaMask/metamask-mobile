// Third party dependencies.
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  HeaderBase,
  Icon,
  IconName,
  IconSize,
  ListItem,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

// External dependencies.
import { strings } from '../../../../locales/i18n';
import { useQRScanner } from '../../hooks/useQRScanner/useQRScanner';

// Internal dependencies.
import { useProfileDrawerStyles } from './ProfileDrawer.styles';
import { ProfileDrawerViewSelectorsIDs } from './ProfileDrawer.testIds';

/**
 * UI-only placeholder rows for the Profile Drawer hub. Each row is intentionally
 * NOT wired to its real destination in this pass (see docs/profile-drawer-design.md).
 */
interface ProfileDrawerRow {
  iconName: IconName;
  label: string;
  testID: string;
}

const PLACEHOLDER_ROWS: ProfileDrawerRow[] = [
  {
    iconName: IconName.Wallet,
    label: strings('profile_drawer.rows.account_selector'),
    testID: ProfileDrawerViewSelectorsIDs.ROW_ACCOUNT_SELECTOR,
  },
  {
    iconName: IconName.Notification,
    label: strings('profile_drawer.rows.notifications'),
    testID: ProfileDrawerViewSelectorsIDs.ROW_NOTIFICATIONS,
  },
  {
    iconName: IconName.Star,
    label: strings('profile_drawer.rows.subscriptions'),
    testID: ProfileDrawerViewSelectorsIDs.ROW_SUBSCRIPTIONS,
  },
  {
    iconName: IconName.Setting,
    label: strings('profile_drawer.rows.settings'),
    testID: ProfileDrawerViewSelectorsIDs.ROW_SETTINGS,
  },
  {
    iconName: IconName.Question,
    label: strings('profile_drawer.rows.help_and_support'),
    testID: ProfileDrawerViewSelectorsIDs.ROW_HELP_AND_SUPPORT,
  },
];

/**
 * Profile Drawer — hub screen listing quick-access rows.
 *
 * This pass is UI-only: only the header Close (pop back) and Scan (QR
 * scanner) actions are real; every row below is a placeholder.
 */
const ProfileDrawer: React.FC = () => {
  const styles = useProfileDrawerStyles();
  const navigation = useNavigation<AppNavigationProp>();
  const { openQRScanner } = useQRScanner();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScanPress = useCallback(() => {
    openQRScanner();
  }, [openQRScanner]);

  const handleProfilePlaceholderPress = useCallback(() => {
    navigation.navigate('ProfileDrawerProfileCreate', undefined);
  }, [navigation]);

  // TODO: wire to real screen
  const handlePlaceholderRowPress = useCallback(() => {
    /* no-op: placeholder rows are not wired in this pass */
  }, []);

  const renderPlaceholderRows = useCallback(
    () =>
      PLACEHOLDER_ROWS.map((row) => (
        <ListItem
          key={row.testID}
          isInteractive
          variant={ListItemVariant.OneLine}
          title={row.label}
          startAccessory={<Icon name={row.iconName} size={IconSize.Sm} />}
          endAccessory={<Icon name={IconName.ArrowRight} size={IconSize.Sm} />}
          accessoryGap={4}
          onPress={handlePlaceholderRowPress}
          testID={row.testID}
        />
      )),
    [handlePlaceholderRowPress],
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={styles.screen}
      testID={ProfileDrawerViewSelectorsIDs.CONTAINER}
    >
      <HeaderBase
        includesTopInset
        startAccessory={
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={ProfileDrawerViewSelectorsIDs.CLOSE_BUTTON}
            accessibilityLabel={strings('profile_drawer.close')}
            accessibilityRole="button"
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Scan}
            size={ButtonIconSize.Md}
            onPress={handleScanPress}
            testID={ProfileDrawerViewSelectorsIDs.SCAN_BUTTON}
            accessibilityLabel={strings('profile_drawer.scan')}
            accessibilityRole="button"
          />
        }
        testID={ProfileDrawerViewSelectorsIDs.HEADER}
      />

      <Box style={styles.content}>
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={styles.profileSection}
        >
          <Pressable
            onPress={handleProfilePlaceholderPress}
            testID={ProfileDrawerViewSelectorsIDs.PROFILE_PLACEHOLDER}
            accessibilityRole="button"
            accessibilityLabel={strings('profile_drawer.create_profile')}
          >
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              style={styles.avatarPlaceholder}
            >
              <Icon name={IconName.Add} size={IconSize.Lg} />
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.createProfileLabel}
            >
              {strings('profile_drawer.create_profile')}
            </Text>
          </Pressable>
        </Box>

        <Box style={styles.rowsSection}>{renderPlaceholderRows()}</Box>
      </Box>
    </SafeAreaView>
  );
};

export default React.memo(ProfileDrawer);
