import React, { useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
// import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '400',
  },
  setting: {
    marginTop: 32,
  },
  toggle: {
    flexDirection: 'row',
    marginLeft: 16,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

const strings = (key: string) =>
  ({
    title: 'Your Wallet is ready',
    description:
      'MetaMask uses default settings to best balance safety and ease of use. Change these settings to further increase your privacy. Learn more about privacy best practices.',
    defaultSettings: 'Default Settings',
    done: 'Done',
    basicFunctionality: 'Basic functionality',
    manageNetworks: 'Manage Networks',
    functionalityBody:
      'Includes token data and value, optimal gas settings, security updates, and more. Using these services shares your IP address with MetaMask, just like when you visit a website.',
  }[key]);

const DefaultSettings = () => {
  const { colors } = useTheme();
  const theme = useTheme();
  const [isEnabled, setIsEnabled] = useState(true);
  return (
    <View style={styles.root}>
      <Text variant={TextVariant.BodyMD}>{strings('description')}</Text>
      <View style={styles.setting}>
        <View style={styles.heading}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('basicFunctionality')}
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={setIsEnabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white['000']}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('functionalityBody')}
        </Text>
      </View>
      <View style={styles.setting}>
        <View style={styles.heading}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('manageNetworks')}
          </Text>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('functionalityBody')}
        </Text>
        <Switch
          value={isEnabled}
          onValueChange={setIsEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white['000']}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
    </View>
  );
};

export default DefaultSettings;
