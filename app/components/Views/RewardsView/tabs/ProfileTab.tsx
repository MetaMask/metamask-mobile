import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useRewardsAuth } from '../../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollContainer: {
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
    },
    profileCard: {
      backgroundColor: colors.background.alternative,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.success.default,
      marginBottom: 8,
    },
    statusText: {
      fontSize: 16,
      color: colors.success.default,
      fontWeight: '600',
      marginBottom: 4,
    },
    statusSubtext: {
      fontSize: 14,
      color: colors.text.alternative,
      textAlign: 'center',
    },
    settingItem: {
      backgroundColor: colors.background.alternative,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    settingInfo: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    settingValue: {
      fontSize: 14,
      color: colors.primary.default,
      fontWeight: '600',
    },
    signOutContainer: {
      marginTop: 24,
      alignItems: 'center',
    },
    signOutButton: {
      marginTop: 16,
    },
    tierBadge: {
      backgroundColor: colors.primary.muted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
    },
    tierText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary.default,
    },
  });

interface ProfileTabProps {
  tabLabel: string;
}

const ProfileTab: React.FC<ProfileTabProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { isLoggedIn, isLoading, logout } = useRewardsAuth();

  const profileSettings = [
    {
      id: '1',
      title: 'Notification Preferences',
      description: 'Manage reward notifications',
      value: 'Enabled',
    },
    {
      id: '2',
      title: 'Privacy Settings',
      description: 'Control data sharing preferences',
      value: 'Standard',
    },
    {
      id: '3',
      title: 'Reward Tier',
      description: 'Your current reward tier level',
      value: 'Bronze',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={styles.profileCard}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>✓ Signed In</Text>
            <Text style={styles.statusSubtext}>
              You're connected to MetaMask Rewards
            </Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>BRONZE TIER</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {profileSettings.map((setting) => (
            <View key={setting.id} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Text style={styles.settingValue}>{setting.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.signOutContainer}>
          <Text style={styles.statusSubtext}>
            Need to switch accounts or sign out?
          </Text>
          <View style={styles.signOutButton}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Auto}
              label="Sign Out"
              onPress={logout}
              loading={isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileTab;