import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  StackActions,
} from '@react-navigation/native';
import LottieView, { AnimationObject } from 'lottie-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import CelebratingFox from '../../../animations/Celebrating_Fox.json';
import styles from './index.styles';
import Device from '../../../util/device';
import { OnboardingSelectorIDs } from '../Onboarding/Onboarding.testIds';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';

interface SocialLoginIosUserProps {
  type: 'new' | 'existing';
}

const SocialLoginIosUser: React.FC<SocialLoginIosUserProps> = ({ type }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const { accountName, oauthLoginSuccess, onboardingTraceCtx, provider } =
    (route.params as {
      accountName?: string;
      oauthLoginSuccess?: boolean;
      onboardingTraceCtx?: unknown;
      provider?: AuthConnection;
    }) || {};

  const isUserTypeNew = type === 'new';

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SOCIAL_LOGIN_IOS_INTERSTITIAL_VIEWED)
        .addProperties({
          is_new_user: isUserTypeNew,
          social_provider: provider,
        })
        .build(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetMetaMaskPin = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SOCIAL_LOGIN_IOS_INTERSTITIAL_CTA_CLICKED,
      )
        .addProperties({
          is_new_user: true,
          social_provider: provider,
        })
        .build(),
    );
    navigation.dispatch(
      StackActions.replace(Routes.ONBOARDING.CHOOSE_PASSWORD, {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess,
        onboardingTraceCtx,
        accountName,
        provider,
      }),
    );
  };

  const handleSecureWallet = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SOCIAL_LOGIN_IOS_INTERSTITIAL_CTA_CLICKED,
      )
        .addProperties({
          is_new_user: false,
          social_provider: provider,
        })
        .build(),
    );
    navigation.dispatch(
      StackActions.replace('Rehydrate', {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        onboardingTraceCtx,
      }),
    );
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.wrapper}>
      <View style={styles.root}>
        <View style={styles.animationContainer}>
          <View style={styles.largeFoxWrapper}>
            <LottieView
              style={styles.foxAnimation}
              autoPlay
              loop
              source={CelebratingFox as AnimationObject}
              resizeMode="contain"
            />
          </View>

          <Text
            variant={TextVariant.DisplayMD}
            color={TextColor.Default}
            testID={
              isUserTypeNew
                ? OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_TITLE
                : OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_TITLE
            }
          >
            {strings(
              isUserTypeNew
                ? 'social_login_ios_user.new_user_title'
                : 'social_login_ios_user.existing_user_title',
            )}
          </Text>
        </View>

        <View style={styles.ctaContainer}>
          <Button
            variant={ButtonVariants.Primary}
            testID={
              isUserTypeNew
                ? OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON
                : OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON
            }
            width={ButtonWidthTypes.Full}
            size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            label={strings(
              isUserTypeNew
                ? 'social_login_ios_user.new_user_button'
                : 'social_login_ios_user.existing_user_button',
            )}
            onPress={isUserTypeNew ? handleSetMetaMaskPin : handleSecureWallet}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SocialLoginIosUser;
