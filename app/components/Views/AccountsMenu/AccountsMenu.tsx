import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';

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
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    quickActionsPlaceholder: {
      height: 80,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const AccountsMenu = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderCenter
        title="Accounts Menu"
        onBack={handleBack}
        backButtonProps={{ testID: AccountsMenuSelectorsIDs.BACK_BUTTON }}
        testID={AccountsMenuSelectorsIDs.ACCOUNTS_MENU_HEADER}
        includesTopInset
      />
      <ScrollView
        style={styles.wrapper}
        testID={AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID}
      >
        {/* Quick Actions Section */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsPlaceholder}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              Quick Actions (Deposit, Earn, Scan)
            </Text>
          </View>
        </View>

        {/* Manage Section */}
        <View style={styles.sectionHeader}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            MANAGE
          </Text>
        </View>

        {/* TODO: Add Manage Wallet row */}
        {/* TODO: Add Contacts row */}
        {/* TODO: Add Permissions row */}
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

        {/* TODO: Add About MetaMask row */}
        {/* TODO: Add Request a Feature row */}
        {/* TODO: Add Support row */}

        {/* TODO: Add Log Out row */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountsMenu;
