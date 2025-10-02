import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import LottieView, { AnimationObject } from 'lottie-react-native';
import fox from '../../../animations/Celebrating_Fox.json';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';
import Device from '../../../util/device';
import { useNavigation } from '@react-navigation/native';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    root: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 20,
      rowGap: Device.isMediumDevice() ? 16 : 24,
    },
    ctaContainer: {
      flexDirection: 'column',
      rowGap: Device.isMediumDevice() ? 12 : 16,
      marginBottom: 16,
      width: '100%',
    },
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
    },
    largeFoxWrapper: {
      width: Device.isMediumDevice() ? 180 : 240,
      height: Device.isMediumDevice() ? 180 : 240,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 'auto',
      padding: Device.isMediumDevice() ? 30 : 40,
      marginTop: 16,
    },
    titleContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      flex: 1,
      rowGap: Device.isMediumDevice() ? 24 : 32,
    },
  });

const SecureExistingWallet = () => {
  const styles = createStyles();
  const navigation = useNavigation();

  const handleSecureWallet = () => {
    navigation.navigate('Rehydrate', {
      [PREVIOUS_SCREEN]: ONBOARDING,
      oauthLoginSuccess: true,
    });
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.wrapper}>
      <View style={styles.root}>
        <View style={styles.titleContainer}>
          <View style={styles.largeFoxWrapper}>
            <LottieView
              style={styles.image}
              autoPlay
              loop
              source={fox as AnimationObject}
              resizeMode="contain"
            />
          </View>

          <Text
            variant={TextVariant.DisplayMD}
            color={TextColor.Default}
            testID={OnboardingSelectorIDs.SECURE_EXISTING_WALLET_TITLE}
          >
            {strings('onboarding.you_are_logged_in')}
          </Text>
        </View>

        <View style={styles.ctaContainer}>
          <Button
            variant={ButtonVariants.Primary}
            testID={OnboardingSelectorIDs.SECURE_EXISTING_WALLET_BUTTON}
            width={ButtonWidthTypes.Full}
            size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            label={strings('onboarding.unlock_your_wallet')}
            onPress={handleSecureWallet}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SecureExistingWallet;
