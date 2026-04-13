import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  StackActions,
} from '@react-navigation/native';
import LottieView, { AnimationObject } from 'lottie-react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { PREVIOUS_SCREEN, ONBOARDING } from '../../../constants/navigation';
import CelebratingFox from '../../../animations/Celebrating_Fox.json';
import Device from '../../../util/device';
import { OnboardingSelectorIDs } from '../Onboarding/Onboarding.testIds';

interface SocialLoginIosUserProps {
  type: 'new' | 'existing';
}

const SocialLoginIosUser: React.FC<SocialLoginIosUserProps> = ({ type }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute();

  const { accountName, oauthLoginSuccess, onboardingTraceCtx, provider } =
    (route.params as {
      accountName?: string;
      oauthLoginSuccess?: boolean;
      onboardingTraceCtx?: unknown;
      provider?: string;
    }) || {};

  const handleSetMetaMaskPin = () => {
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
    navigation.dispatch(
      StackActions.replace(Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE, {
        [PREVIOUS_SCREEN]: ONBOARDING,
        oauthLoginSuccess: true,
        onboardingTraceCtx,
      }),
    );
  };

  const isUserTypeNew = type === 'new';
  const isMedium = Device.isMediumDevice();
  const foxSize = isMedium ? 180 : 240;
  const foxPadding = isMedium ? 30 : 40;

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        paddingHorizontal={5}
        gap={isMedium ? 4 : 6}
        twClassName="w-full flex-1"
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          gap={isMedium ? 6 : 8}
          twClassName="w-full flex-1"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            marginTop={4}
            style={{
              width: foxSize,
              height: foxSize,
              padding: foxPadding,
            }}
          >
            <LottieView
              style={tw.style({
                alignSelf: 'center',
                width: foxSize,
                height: foxSize,
              })}
              autoPlay
              loop
              source={CelebratingFox as AnimationObject}
              resizeMode="contain"
            />
          </Box>

          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
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
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={isMedium ? 3 : 4}
          marginBottom={4}
          twClassName="w-full"
        >
          <Button
            variant={ButtonVariant.Primary}
            testID={
              isUserTypeNew
                ? OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON
                : OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON
            }
            isFullWidth
            size={isMedium ? ButtonSize.Md : ButtonSize.Lg}
            onPress={isUserTypeNew ? handleSetMetaMaskPin : handleSecureWallet}
          >
            {strings(
              isUserTypeNew
                ? 'social_login_ios_user.new_user_button'
                : 'social_login_ios_user.existing_user_button',
            )}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default SocialLoginIosUser;
