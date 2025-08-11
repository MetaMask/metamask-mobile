import React from 'react';
import { SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { useRewardsAuth } from '../../hooks/useRewardsAuth';
import { useValidateReferralCode } from '../../hooks/useValidateReferralCode';
import {
  Box,
  Text,
  Button,
  ButtonIcon,
  TextVariant,
  ButtonSize,
  ButtonVariant,
  ButtonIconSize,
  IconName,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import rewards from '../../../../../images/rewards/rewards.png';
import { resetOnboarding } from '../../../../../actions/rewards';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import TextField from '../../../../../component-library/components/Form/TextField';

const Onboarding5: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { optin, optinError } = useRewardsAuth();
  const {
    referralCode,
    error: referralCodeError,
    setReferralCode: handleReferralCodeChange,
    isValidating: isValidatingReferralCode,
  } = useValidateReferralCode();

  const handleSkip = () => {
    // Reset onboarding state so we can jump from step 1 to 5 next time
    dispatch(resetOnboarding());
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.WALLET.HOME }],
    });
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.ArrowLeft}
        onPress={handleSkip}
        style={tw.style('absolute top-4 left-4 z-10')}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.Center}
        twClassName="my-8"
      >
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-7 h-2 rounded-md bg-text-default mx-1" />
      </Box>

      {/* Error */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mb-4 min-h-20">
        {optinError && (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={optinError}
          />
        )}
      </Box>

      <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 px-4 mt-2">
        {/* Placeholder Image */}
        <Box twClassName="w-25 h-25 mb-6">
          <Image source={rewards} style={tw.style('w-full h-full')} />
        </Box>

        {/* Title */}
        <Text variant={TextVariant.HeadingLg} twClassName="text-center mb-6">
          You unlocked 250 points!
        </Text>

        {/* Points Display */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="w-full mb-16 border border-muted rounded-lg px-4 py-3 justify-between"
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            Sign-up bonus
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.BodyMd} twClassName="font-bold">
              250 points
            </Text>
          </Box>
        </Box>

        {/* Referral Code Input */}
        <Box twClassName="w-full mb-2">
          <TextField
            placeholder="Enter referral code (optional)"
            value={referralCode}
            onChangeText={handleReferralCodeChange}
            style={tw.style(
              `py-6 bg-background-pressed ${
                referralCodeError && `border-1 border-error-default`
              }`,
            )}
          />
          {/* End accessory is not working */}
          {isValidatingReferralCode ? (
            <Box
              alignItems={BoxAlignItems.End}
              twClassName="w-full pr-2 mt-[-34px]"
            >
              <ActivityIndicator />
            </Box>
          ) : null}
          {referralCodeError ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default mt-2"
            >
              {referralCodeError}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={optin}
          twClassName="w-full"
          disabled={Boolean(referralCodeError)}
        >
          Claim points
        </Button>
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-alternative text-center mt-3"
        >
          Joining means we&apos;ll track your on-chain activity to reward you
          automatically.{' '}
          <Text variant={TextVariant.BodySm} twClassName="text-primary-default">
            Learn more.
          </Text>
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default Onboarding5;
