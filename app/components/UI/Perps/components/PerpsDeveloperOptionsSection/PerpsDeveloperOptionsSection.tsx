import React, { useCallback } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { PerpsTestnetToggle } from './PerpsTestnetToggle';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsDeveloperOptionsSectionSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsDeveloperOptionsSectionStyles = () =>
  StyleSheet.create({
    container: {
      marginTop: 8,
      gap: 8,
    },
    heading: {
      marginTop: 16,
    },
    perpsSandboxButton: {
      width: '100%',
      marginTop: 8,
    },
  });

export const PerpsDeveloperOptionsSection = () => {
  const { styles } = useStyles(PerpsDeveloperOptionsSectionStyles, {});

  const { navigate } = useNavigation();

  const onPerpsSandbox = useCallback(() => {
    navigate(Routes.PERPS.ROOT);
  }, [navigate]);

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
      <Button
        style={styles.perpsSandboxButton}
        label={strings('perps.developer_options.perps_sandbox_button')}
        onPress={onPerpsSandbox}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Md}
        testID={PerpsDeveloperOptionsSectionSelectorsIDs.PERPS_SANDBOX_BUTTON}
      />
    </View>
  );
};
