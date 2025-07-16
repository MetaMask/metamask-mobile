import React from 'react';
import { Image } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './AdditionalVerification.styles.ts';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useNavigation } from '@react-navigation/native';
import PoweredByTransak from '../../components/PoweredByTransak';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../../../../component-library/components/Buttons/Button';
import additionalVerificationImage from '../../assets/additional-verification.png';

const AdditionalVerification = () => {
  const navigation = useNavigation();
  const { styles, theme }: any = useStyles(styleSheet, {});

  React.useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: 'Verify your identity' },
        theme,
      ),
    );
  }, [navigation, theme]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Image
            source={additionalVerificationImage}
            resizeMode={'contain'}
            style={styles.image}
          />
          <Text style={styles.title}>Additional Verification</Text>
          <Text style={styles.paragraph}>
            For larger deposits, you’ll need a valid ID (like a driver’s license) and a real-time selfie.
          </Text>
          <Text style={styles.paragraph}>
            In order to complete your verification, you’ll need to enable access to your camera.
          </Text>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            size={ButtonSize.Lg}
            onPress={() => {/* TODO: handle continue */}}
            label={'Continue'}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default AdditionalVerification; 