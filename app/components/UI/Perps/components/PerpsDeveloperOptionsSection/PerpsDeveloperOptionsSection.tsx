import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import { PerpsConnectionErrorButton } from './PerpsConnectionErrorButton';

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
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {strings('perps.perps_trading')}
      </Text>
      <PerpsTestnetToggle />
      <PerpsConnectionErrorButton />
    </View>
  );
};
