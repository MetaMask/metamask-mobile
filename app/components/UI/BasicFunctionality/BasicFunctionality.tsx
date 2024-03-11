import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../app/util/theme';
import { strings } from '../../../../locales/i18n';

interface BasicFunctionalityComponentProps {
  isEnabled: boolean;
  handleSwitchToggle: () => void;
}

const styles = StyleSheet.create({
  setting: {
    marginTop: 32,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default function BasicFunctionalityComponent({
  isEnabled,
  handleSwitchToggle,
}: BasicFunctionalityComponentProps) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('default_settings.basic_functionality')}
        </Text>
        <Switch
          value={isEnabled}
          onChange={handleSwitchToggle}
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
        {strings('default_settings.functionality_body')}
      </Text>
    </View>
  );
}
