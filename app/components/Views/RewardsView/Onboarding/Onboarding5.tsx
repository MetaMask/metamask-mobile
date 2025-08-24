import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import { useRewardsAuth } from '../../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';
import { resetOnboarding } from '../../../../actions/rewardsOnboarding';
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
} from '@metamask/design-system-react-native';
import TextField from '../../../../component-library/components/Form/TextField';

const Onboarding5: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { optin } = useRewardsAuth();
  const [referralCode, setReferralCode] = useState('');

  const handleSkip = () => {
    // Reset onboarding state so we can jump from step 1 to 5 next time
    dispatch(resetOnboarding());
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.WALLET.HOME }],
    });

    // Debug: Clear onboarding completed flag
    // StorageWrapper.clearAll();
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.ArrowLeft}
        onPress={handleSkip}
        style={tw.style('absolute top-4 left-4 z-10')}
      />

      <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 px-6 pt-15">
        {/* Placeholder Image */}
        <Box twClassName="w-25 h-25 bg-text-default rounded-lg mb-6" />

        {/* Title */}
        <Text variant={TextVariant.HeadingLg} twClassName="text-center mb-6">
          You&apos;ve unlocked 250 points!
        </Text>

        {/* Points Display */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="w-full mb-45 border border-muted rounded-lg px-4 py-3 justify-between"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <ButtonIcon size={ButtonIconSize.Sm} iconName={IconName.Edit} />
            <Text variant={TextVariant.BodyMd} twClassName="font-bold">
              250 points
            </Text>
          </Box>
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            Sign-up bonus
          </Text>
        </Box>

        {/* Referral Code Input */}
        <Box twClassName="w-full mb-2">
          <TextField
            placeholder="Enter referral code (optional)"
            value={referralCode}
            onChangeText={setReferralCode}
          />
        </Box>

        {/* Caption */}
        <Box alignItems={BoxAlignItems.Start} twClassName="w-full mb-8">
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative text-left"
          >
            Got a code? Drop it in. Otherwise, skip ahead.
          </Text>
        </Box>

        {/* Terms */}
        <Box twClassName="w-full mb-6 px-4 py-3 bg-muted rounded-lg">
          <Text variant={TextVariant.BodyMd} twClassName="font-bold mb-2">
            On-chain tracking
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative leading-5"
          >
            By joining, you agree to on-chain tracking for automatic rewards.
          </Text>
        </Box>
      </Box>

      <Box twClassName="px-6 pb-10">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={optin}
          twClassName="w-full"
        >
          Claim my 250 points now
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default Onboarding5;
