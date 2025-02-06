import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';

import { useTheme } from '../../../../../util/theme';
import { useAlerts } from '../context';

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      borderWidth: 0.5,
      borderColor: colors.error.default,
      backgroundColor: colors.error.muted,
    },
  });

const AlertBanner = () => {
  const { generalAlerts } = useAlerts();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if(generalAlerts?.length === 0){
    return null;
  }

  if (generalAlerts?.length > 1) {
    return (
      <View style={styles.wrapper}>
        <Text>You have multiple generalAlerts</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text>{generalAlerts[0].title}</Text>
      <Text>{generalAlerts[0].message}</Text>
    </View>
  );
};

export default AlertBanner;
