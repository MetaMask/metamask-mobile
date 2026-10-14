import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import { PerpsProviderToggle } from './PerpsProviderToggle';
import { PerpsConnectionErrorButton } from './PerpsConnectionErrorButton';
import { PerpsHIP3DebugButton } from './PerpsHIP3DebugButton';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes';

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

  const handleOpenGtmModal = useCallback(() => {
    NavigationService.navigation?.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.GTM_MODAL,
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('perps.perps_trading')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        isFullWidth
        onPress={handleOpenGtmModal}
      >
        {'Open go-to-market modal'}
      </Button>
      <PerpsTestnetToggle />
      <PerpsProviderToggle />
      <PerpsConnectionErrorButton />
      <PerpsHIP3DebugButton />
    </View>
  );
};
