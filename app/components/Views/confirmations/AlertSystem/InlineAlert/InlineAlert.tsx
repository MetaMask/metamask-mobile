import React from 'react';
import Icon, { IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import Text, { TextColor, TextVariant } from '../../../../../component-library/components/Texts/Text';
import { IconSizes } from '../../../../../component-library/components-temp/KeyValueRow';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import { useTheme } from '../../../../../util/theme';
import { Severity } from '../../types/confirm';

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
      marginTop: 8,
      padding: 2,
      // paddingVertical: 2,
      // paddingHorizontal: 4,
      backgroundColor: colors.error.default,
      borderRadius: 4,
    },
    inlineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    // icon: {
    //   marginRight: 8,
    // },
    // text: {
    //   color: colors.error.default,
    //   marginLeft: 4,
    // },
  });

export interface InlineAlertProps {
  /** The onClick handler for the inline alerts */
  onClick?: () => void;
  /** The severity of the alert, e.g. Severity.Warning */
  severity?: Severity;
  /** Additional styles to apply to the inline alert */
  style?: ViewStyle;
}

const getBackgroundColor = (severity: Severity, colors: ThemeColors) => {
  switch (severity) {
    case Severity.Danger:
      return colors.error.muted;
    case Severity.Warning:
      return colors.warning.muted;
    case Severity.Info:
      return colors.info.muted;
    default:
      return colors.info.default;
  }
};

const getTextColor = (severity: Severity) => {
  switch (severity) {
    case Severity.Danger:
      return TextColor.Error;
    case Severity.Warning:
      return TextColor.Warning;
    case Severity.Info:
      return TextColor.Info;
    default:
      return TextColor.Default;
  }
};

export default function InlineAlert({
  onClick,
  severity = Severity.Info,
  style,
}: InlineAlertProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.wrapper, { backgroundColor: getBackgroundColor(severity, colors) }, style]}>
      <TouchableOpacity
        data-testid="inline-alert"
        onPress={onClick}
        style={[styles.inlineContainer]}
      >
        <Icon
          name={severity === Severity.Info ? IconName.Info : IconName.Danger}
          size={IconSize.Sm}
          color={getTextColor(severity)}
        />
        <Text variant={TextVariant.BodySM} color={getTextColor(severity)}>
          {'Alert'}
        </Text>
        <Icon name={IconName.ArrowRight} size={IconSizes.Xs} color={getTextColor(severity)}/>
      </TouchableOpacity>
    </View>
  );
}
