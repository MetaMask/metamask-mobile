import React, { type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';

interface SettingsToggleRowProps {
  description: ReactNode;
  onValueChange: (value: boolean) => void;
  testID?: string;
  title: string;
  value: boolean;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  description: {
    marginTop: 8,
  },
  switch: {
    alignSelf: 'flex-start',
  },
  title: {
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  toggle: {
    marginLeft: 16,
  },
});

export const SettingsToggleRow = ({
  description,
  onValueChange,
  testID,
  title,
  value,
}: SettingsToggleRowProps) => {
  const { brandColors, colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.title}
        >
          {title}
        </Text>
        <View style={styles.toggle}>
          <Switch
            accessibilityLabel={title}
            ios_backgroundColor={colors.border.muted}
            onValueChange={onValueChange}
            style={styles.switch}
            testID={testID}
            thumbColor={brandColors.white}
            trackColor={{
              false: colors.border.muted,
              true: colors.primary.default,
            }}
            value={value}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.description}
      >
        {description}
      </Text>
    </View>
  );
};
