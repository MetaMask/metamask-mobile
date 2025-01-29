import React from 'react';
import Icon, { IconName, IconSize } from '../../../../../../component-library/components/Icons/Icon';
import Text, { TextColor, TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { IconSizes } from '../../../../../../component-library/components-temp/KeyValueRow';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import { useTheme } from '../../../../../../util/theme';

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: colors.error.default,
      color: colors.error.muted,
      borderRadius: 20,
      padding: 10,
    },
    inlineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    icon: {
      marginRight: 8,
    },
    text: {
      flexShrink: 1,
    },
  });

export enum Severity {
  Danger = 'danger',
  Warning = 'warning',
  Info = 'info',
  Success = 'success',
}

export interface InlineAlertProps {
  /** The onClick handler for the inline alerts */
  onClick?: () => void;
  /** The severity of the alert, e.g. Severity.Warning */
  severity?: Severity;
  /** Additional styles to apply to the inline alert */
  style?: React.CSSProperties;
}

export default function InlineAlert({
  onClick,
  severity = Severity.Info,
  style,
}: InlineAlertProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.wrapper]}>
      <TouchableOpacity
        data-testid="inline-alert"
        onPress={onClick}
        style={styles.inlineContainer}
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Sm}
          style={styles.icon}
        />
        <Text variant={TextVariant.BodySM} color={TextColor.Default} style={styles.text}>
          {'Alert'}
        </Text>
        <Icon name={IconName.ArrowRight} size={IconSizes.Xs} style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
}
