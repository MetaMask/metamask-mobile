import React, { useEffect, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import createStyles from './index.styles';
import {
  default as Text,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../component-library/components/Icons/Icon';

interface SettingsCardProps {
  title: string;
  titleColor?: string;
  iconName: IconName;
  iconColor?: string;
  caption?: string;
  hideCaret?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  testID?: string;
}

const SettingsCard = ({
  iconName,
  iconColor = '',
  title,
  titleColor = '',
  caption = '',
  hideCaret = false,
  isFirst = false,
  isLast = false,
  onPress = () => null,
}: SettingsCardProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const containerStyle = useMemo(
    () => [
      styles.settingsCard,
      !isFirst && styles.separator,
      isFirst && styles.first,
      isLast && styles.last,
    ],
    [styles, isFirst, isLast],
  );

  const memoizedIconColor = useMemo(() => {
    if (iconColor) return iconColor;
    return colors.text.default;
  }, [iconColor, colors.text.default]);

  const memoizedTitleColor = useMemo(() => {
    if (titleColor) return titleColor;
    return colors.text.default;
  }, [titleColor, colors.text.default]);

  return (
    <TouchableOpacity
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${title} settings`}
      style={containerStyle}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <View style={styles.icon}>
            <Icon
              name={iconName}
              size={IconSize.Md}
              color={memoizedIconColor}
            />
          </View>
          <View style={styles.column}>
            <Text color={memoizedTitleColor} variant={TextVariant.BodyMD}>
              {title}
            </Text>
            {caption && <Text variant={TextVariant.BodySM}>{caption}</Text>}
          </View>
        </View>
        {!hideCaret && (
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Md}
            color={colors.text.alternative}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

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
        <SettingsCard title="Contacts" iconName={IconName.Contacts} isFirst />
        <SettingsCard title="Permissions" iconName={IconName.Permissions} />
        <SettingsCard title="Networks" iconName={IconName.Network} />
        <SettingsCard title="Snaps" iconName={IconName.Snaps} isLast />
      </View>
      <View style={styles.section}>
        <SettingsCard
          title="Settings"
          iconName={IconName.Setting}
          isFirst
          isLast
        />
      </View>
      <View style={styles.section}>
        <SettingsCard
          title="Request a feature"
          iconName={IconName.Paper}
          isFirst
        />
        <SettingsCard title="About MetaMask" iconName={IconName.Info} />
        <SettingsCard title="Support" iconName={IconName.MessageQuestion} />
      </View>
      <View style={styles.section}>
        <SettingsCard
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
