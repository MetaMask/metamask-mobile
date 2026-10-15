import React, { useCallback } from 'react';
import { Switch, View, type StyleProp, type TextStyle } from 'react-native';
import { createStyles } from './styles';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';

interface SecurityOptionsToggleProps {
  title: string;
  description?: string;
  value: boolean;
  onOptionUpdated: (enabled: boolean) => void;
  testId?: string;
  disabled?: boolean;
  descriptionVariant?: TextVariant;
  descriptionFontWeight?: FontWeight;
  descriptionStyle?: StyleProp<TextStyle>;
}

/**
 * View that renders the toggle for security options
 * This component assumes that the parent will manage the state of the toggle. This is because most of the state is global.
 */
const SecurityOptionToggle = ({
  title,
  description,
  value,
  testId,
  onOptionUpdated,
  disabled,
  descriptionVariant = TextVariant.BodySm,
  descriptionFontWeight = FontWeight.Medium,
  descriptionStyle,
}: SecurityOptionsToggleProps) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles();

  const handleOnValueChange = useCallback(
    (newValue: boolean) => {
      onOptionUpdated(newValue);
    },
    [onOptionUpdated],
  );
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
        <View style={styles.switchElement}>
          <Switch
            value={value}
            onValueChange={(newValue: boolean) => handleOnValueChange(newValue)}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            disabled={disabled}
            testID={testId}
          />
        </View>
      </View>
      {description ? (
        <Text
          variant={descriptionVariant}
          fontWeight={descriptionFontWeight}
          color={TextColor.TextAlternative}
          style={[styles.desc, descriptionStyle]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
};

export default React.memo(SecurityOptionToggle);
