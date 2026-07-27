import React from 'react';
import { View } from 'react-native';
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
import styleSheet from '../../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

export const PerpsDeveloperOptionsSection = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.sectionCard}>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingSm}
        style={styles.heading}
      >
        {strings('perps.perps_trading')}
      </Text>
      <PerpsTestnetToggle />
      <View style={styles.divider} />
      <PerpsProviderToggle />
      <View style={styles.divider} />
      <View style={styles.buttonStack}>
        <PerpsConnectionErrorButton />
        <PerpsHIP3DebugButton />
      </View>
    </View>
  );
};
