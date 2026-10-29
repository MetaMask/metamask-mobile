import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useDispatch, useStore } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonSize,
  Skeleton,
  TitleStandard,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import FooterGlass from '../../../component-library/components-temp/FooterGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../core/NavigationService/types';
import type { RootState } from '../../../reducers';
import { clearPendingReferralCode } from '../../../reducers/rewardsMoney';
import { selectReferralMeEntry } from '../../../reducers/rewardsMoney/selectors';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { resetToHomeAction } from '../../../util/onboarding/getOnboardingExitAction';
import { useReferralMe } from '../../UI/Rewards/hooks/useReferralMe';
import { useMoneyReferralInvite } from '../../UI/Rewards/hooks/useMoneyReferralInvite';
import MoneyReferralCodeField from '../../UI/Rewards/components/Money/MoneyReferralCodeField';
import { OnboardingMoneyReferralTestIds } from './OnboardingMoneyReferral.testIds';

/** How long the invite may take to load before onboarding moves on without it. */
export const ONBOARDING_MONEY_REFERRAL_LOAD_BUDGET_MS = 5000;

const CODE_FIELD_TEST_IDS = {
  field: OnboardingMoneyReferralTestIds.CODE_FIELD,
  input: OnboardingMoneyReferralTestIds.CODE_INPUT,
  error: OnboardingMoneyReferralTestIds.CODE_ERROR,
};

/**
 * Last onboarding step for a wallet created from a Money referral link.
 *
 * Reached only once Basic Functionality is settled, so its reads are the
 * first Money calls of the session. A failed, slow, or offline load, or a
 * profile that can no longer accept an invite, moves on to Home without the
 * code. Leaving the step — by any path — answers the code, so Home does not
 * offer it again.
 */
const OnboardingMoneyReferral = () => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'OnboardingMoneyReferral'>>();
  const networkTier = useNetworkTier();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hasExitedRef = useRef(false);
  const exitToHome = useCallback(() => {
    // A late read or timer must not reset a navigator this step already left.
    if (hasExitedRef.current || !isMountedRef.current) {
      return;
    }
    hasExitedRef.current = true;
    dispatch(clearPendingReferralCode());
    navigation.dispatch(resetToHomeAction());
  }, [dispatch, navigation]);

  const { profileId, fetchReferralMe } = useReferralMe({
    fetchOnMount: false,
  });

  const {
    copy,
    isCopyPending,
    referralCode,
    onChangeReferralCode,
    errorMessage,
    canAccept,
    isAccepting,
    accept,
    respond,
  } = useMoneyReferralInvite({
    initialReferralCode: route.params.referralCode,
    profileId,
    location: 'onboarding',
    onAutoDismiss: exitToHome,
    onAccepted: exitToHome,
  });

  const hasStartedLoadRef = useRef(false);
  useEffect(() => {
    if (hasStartedLoadRef.current) {
      return;
    }
    hasStartedLoadRef.current = true;
    fetchReferralMe({ forceFresh: true })
      .then((result) => {
        const isLoaded =
          result.status === 'settled' &&
          Boolean(
            selectReferralMeEntry(store.getState(), result.profileId)?.data,
          );
        if (!isLoaded) {
          exitToHome();
        }
      })
      .catch(exitToHome);
  }, [exitToHome, fetchReferralMe, store]);

  useEffect(() => {
    if (!isCopyPending) {
      return;
    }
    const timer = setTimeout(
      exitToHome,
      ONBOARDING_MONEY_REFERRAL_LOAD_BUDGET_MS,
    );
    return () => clearTimeout(timer);
  }, [exitToHome, isCopyPending]);

  // `null` is an unknown tier, not offline. Once the offer is on screen a
  // dropped connection is left to the Continue error rather than a jump away.
  const isOffline = networkTier === 'NONE';
  useEffect(() => {
    if (isOffline && isCopyPending) {
      exitToHome();
    }
  }, [exitToHome, isCopyPending, isOffline]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);

  const handleSkip = useCallback(() => {
    if (respond('declined')) {
      exitToHome();
    }
  }, [exitToHome, respond]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={OnboardingMoneyReferralTestIds.SCREEN}
    >
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
      />

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={[
          tw.style('px-4 pb-4'),
          { paddingTop: headerInset },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isCopyPending ? (
          <Box
            twClassName="gap-y-3 pb-6"
            testID={OnboardingMoneyReferralTestIds.COPY_SKELETON}
          >
            <Skeleton height={32} width="60%" twClassName="rounded-lg" />
            <Skeleton height={20} width="100%" twClassName="rounded-lg" />
            <Skeleton height={20} width="80%" twClassName="rounded-lg" />
          </Box>
        ) : (
          <TitleStandard
            title={copy.title}
            bottomLabel={copy.body || undefined}
            titleProps={{ testID: OnboardingMoneyReferralTestIds.TITLE }}
            bottomLabelProps={{ testID: OnboardingMoneyReferralTestIds.BODY }}
            twClassName="pb-6"
          />
        )}
        <MoneyReferralCodeField
          label={copy.codeLabel}
          value={referralCode}
          onChangeText={onChangeReferralCode}
          errorMessage={errorMessage}
          isDisabled={isAccepting}
          testIds={CODE_FIELD_TEST_IDS}
        />
      </ScrollView>

      <FooterGlass
        twClassName="pt-2 pb-2"
        primaryButtonProps={{
          children: copy.accept,
          onPress: accept,
          size: ButtonSize.Lg,
          isLoading: isAccepting || isCopyPending,
          isDisabled: !canAccept || isCopyPending,
          testID: OnboardingMoneyReferralTestIds.CONTINUE_BUTTON,
        }}
        tertiaryButtonProps={{
          children: copy.decline,
          onPress: handleSkip,
          size: ButtonSize.Lg,
          isDisabled: isAccepting,
          testID: OnboardingMoneyReferralTestIds.SKIP_BUTTON,
        }}
      />
    </SafeAreaView>
  );
};

export default OnboardingMoneyReferral;
