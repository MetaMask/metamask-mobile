import React from 'react';
import { View } from 'react-native';
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
import styles from './index.styles';

const SocialLoginSuccessExistingUser = () => {
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
            testID={
              OnboardingSelectorIDs.SOCIAL_LOGIN_SUCCESS_EXISTING_USER_TITLE
            }
          >
            {strings('onboarding.you_are_logged_in')}
          </Text>
        </View>

        <View style={styles.ctaContainer}>
          <Button
            variant={ButtonVariants.Primary}
            testID={
              OnboardingSelectorIDs.SOCIAL_LOGIN_SUCCESS_EXISTING_USER_BUTTON
            }
            width={ButtonWidthTypes.Full}
            size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            label={strings('onboarding.unlock_wallet')}
            onPress={handleSecureWallet}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SocialLoginSuccessExistingUser;
