import React from 'react';
import { View, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import { PerpsProviderToggle } from './PerpsProviderToggle';
import { PerpsConnectionErrorButton } from './PerpsConnectionErrorButton';
import { PerpsHIP3DebugButton } from './PerpsHIP3DebugButton';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const PerpsDeveloperOptionsSectionStyles = () =>
  StyleSheet.create({
    container: {
      marginTop: 8,
      gap: 8,
    },
    heading: {
      marginTop: 16,
    },
  });

export const PerpsDeveloperOptionsSection = () => {
  const { styles } = useStyles(PerpsDeveloperOptionsSectionStyles, {});

  return (
    <View style={styles.container}>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('perps.perps_trading')}
      </Text>
      <PerpsTestnetToggle />
      <PerpsProviderToggle />
      <PerpsConnectionErrorButton />
      <PerpsHIP3DebugButton />
    </View>
  );
};
