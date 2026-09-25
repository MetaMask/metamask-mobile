import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { setOnboardingReferralCode } from '../../../reducers/rewards';
import { selectOnboardingReferralCode } from '../../../reducers/rewards/selectors';
import ReferralInviteCodeField from '../../UI/Rewards/components/KolDashboard/ReferralInviteCodeField';
import { KOL_INVITE_FIXTURE } from '../../UI/Rewards/components/KolDashboard/rewardsUiFixtures';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import { OnboardingInviteTestIds } from './OnboardingInvite.testIds';

const REFERRAL_CODE_FIELD_TEST_IDS = {
  field: OnboardingInviteTestIds.REFERRAL_CODE_FIELD,
  input: OnboardingInviteTestIds.REFERRAL_CODE_INPUT,
};

const OnboardingInvite = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'OnboardingInvite'>>();
  const { onComplete } = route.params;
  const storedReferralCode = useSelector(selectOnboardingReferralCode);
  const [referralCode, setReferralCode] = useState(
    storedReferralCode ?? KOL_INVITE_FIXTURE.referralCode,
  );

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.ONBOARDING.INTEREST_QUESTIONNAIRE, {
      onComplete: () => {
        navigation.navigate(Routes.ONBOARDING.INVITE, { onComplete });
      },
    });
  }, [navigation, onComplete]);

  useEffect(() => {
    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true;
      },
    );

    return () => {
      backHandlerSubscription.remove();
    };
  }, [handleBack]);

  const handleAccept = useCallback(() => {
    dispatch(setOnboardingReferralCode(referralCode || null));
    onComplete();
  }, [dispatch, onComplete, referralCode]);

  const handleDecline = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={OnboardingInviteTestIds.SCREEN}
    >
      <HeaderStandard
        includesTopInset
        onBack={handleBack}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
          testID: OnboardingInviteTestIds.BACK_BUTTON,
        }}
      />
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 flex-col gap-y-6')}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Box twClassName="flex flex-col gap-y-1">
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            testID={OnboardingInviteTestIds.TITLE}
          >
            {strings('onboarding_invite.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={OnboardingInviteTestIds.DESCRIPTION}
          >
            {strings('onboarding_invite.description')}
          </Text>
        </Box>

        <ReferralInviteCodeField
          referralCode={referralCode}
          onChangeReferralCode={setReferralCode}
          testIds={REFERRAL_CODE_FIELD_TEST_IDS}
        />
      </ScrollView>

      <Box twClassName="px-4 pt-2 pb-4 flex flex-col items-center gap-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleAccept}
          isFullWidth
          isDisabled={referralCode.length < KOL_INVITE_FIXTURE.codeLength}
          testID={OnboardingInviteTestIds.CONTINUE_BUTTON}
        >
          {strings('onboarding_invite.continue')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDecline}
          testID={OnboardingInviteTestIds.CANCEL_BUTTON}
        >
          {strings('onboarding_invite.cancel')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default OnboardingInvite;
