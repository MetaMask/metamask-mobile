import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../hooks/useStyles';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Settings → Developer Options entry for the Kalshi POC. Hidden behind dev
 * options by design: the POC is throwaway quality and not for end users.
 */
const styleSheetFn = () =>
  StyleSheet.create({
    container: { marginTop: 8, gap: 8 },
    heading: { marginTop: 16 },
  });

export const PredictNextDeveloperOptionsSection = () => {
  const { styles } = useStyles(styleSheetFn, {});
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        PredictNext (Kalshi POC)
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        label="Open Kalshi POC"
        onPress={() => navigation.navigate(Routes.PREDICT_NEXT_POC)}
      />
    </View>
  );
};
