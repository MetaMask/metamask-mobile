import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import createStyles from './index.styles';
import {
  default as Text,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { IconName } from '../../../component-library/components/Icons/Icon';
import SettingsDrawer from '../../../components/UI/SettingsDrawer';

const Profile = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  useEffect(() => {
    navigation.setOptions({
      title: 'Profile',
      headerTitleAlign: 'left',
      headerTitle: (
        <Text variant={TextVariant.HeadingLG} style={styles.headerTitle}>
          Profile
        </Text>
      ),
      headerLeft: () => null,
      headerRight: () => null,
    });
  }, [colors, navigation, styles.headerTitle]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <SettingsDrawer title="Contacts" iconName={IconName.Contacts} isFirst />
        <SettingsDrawer title="Permissions" iconName={IconName.Permissions} />
        <SettingsDrawer title="Networks" iconName={IconName.Network} />
        <SettingsDrawer title="Snaps" iconName={IconName.Snaps} isLast />
      </View>
      <View style={styles.section}>
        <SettingsDrawer
          title="Settings"
          iconName={IconName.Setting}
          isFirst
          isLast
        />
      </View>
      <View style={styles.section}>
        <SettingsDrawer
          title="Request a feature"
          iconName={IconName.Paper}
          isFirst
        />
        <SettingsDrawer title="About MetaMask" iconName={IconName.Info} />
        <SettingsDrawer title="Support" iconName={IconName.MessageQuestion} />
      </View>
      <View style={styles.section}>
        <SettingsDrawer
          title="Lock"
          titleColor={colors.primary.default}
          iconName={IconName.Lock}
          iconColor={colors.primary.default}
          isFirst
          isLast
          hideCaret
        />
      </View>
    </ScrollView>
  );
};

export default Profile;
