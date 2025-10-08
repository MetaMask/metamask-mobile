import React, { useLayoutEffect } from 'react';
import { View, ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  ParamListBase,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LottieView, { AnimationObject } from 'lottie-react-native';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';
import { useTheme } from '../../../util/theme';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';

import CelebratingFox from '../../../animations/Celebrating_Fox.json';
import createStyles from './index.styles';

const SocialLoginSuccessNewUser: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { accountName, oauthLoginSuccess, onboardingTraceCtx } =
    (route.params as {
      accountName?: string;
      oauthLoginSuccess?: boolean;
      onboardingTraceCtx?: unknown;
    }) || {};

  useLayoutEffect(() => {
    navigation.setOptions(
      getTransparentOnboardingNavbarOptions(colors, undefined, false),
    );
  }, [navigation, colors]);

  const handleSetMetaMaskPin = () => {
    navigation.replace(Routes.ONBOARDING.CHOOSE_PASSWORD, {
      [PREVIOUS_SCREEN]: ONBOARDING,
      oauthLoginSuccess,
      onboardingTraceCtx,
      accountName,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.animationContainer}>
          <LottieView
            style={styles.foxAnimation}
            autoPlay
            loop
            source={CelebratingFox as AnimationObject}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text variant={TextVariant.DisplayMD} style={styles.title}>
            {strings('social_login_success.title')}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleSetMetaMaskPin}
          label={strings('social_login_success.set_metamask_pin')}
        />
      </View>
    </ScrollView>
  );
};

export default SocialLoginSuccessNewUser;
