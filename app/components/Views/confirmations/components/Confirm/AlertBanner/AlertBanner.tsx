import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';

import { useTheme } from '../../../../../../util/theme';
import { useAlerts } from '../../../context/Alerts';

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      borderWidth: 0.5,
      borderColor: colors.error.default,
      backgroundColor: colors.error.muted,
    },
  });

const AlertBanner = () => {
  const { alerts } = useAlerts();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (alerts?.length > 1) {
    return (
      <View style={styles.wrapper}>
        <Text>You have multiple alerts</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text>{alerts[0].title}</Text>
      <Text>{alerts[0].message}</Text>
    </View>
  );
};

export default AlertBanner;
