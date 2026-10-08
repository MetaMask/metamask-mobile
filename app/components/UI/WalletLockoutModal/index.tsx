import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CookieManager from '@react-native-cookies/cookies';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Authentication } from '../../../core';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { clearHistory } from '../../../actions/browser';
import { RootState } from '../../../reducers';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import type { AppNavigationProp } from '../../../core/NavigationService/types';

export const WalletLockoutSelectors = {
  CONTAINER: 'wallet-lockout-container',
  RESET_BUTTON: 'wallet-lockout-reset-button',
  ERROR: 'wallet-lockout-error',
};

const WalletLockoutModal = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { isEnabled } = useAnalytics();
  const modalRef = useRef<BottomSheetRef>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const navigateOnboardingRoot = () => {
    navigation.reset({
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          state: {
            routes: [
              {
                name: Routes.ONBOARDING.NAV,
                params: {
                  screen: Routes.ONBOARDING.ONBOARDING,
                  params: { delete: true },
                },
              },
            ],
          },
        },
      ],
    });
  };

  const resetWallet = async () => {
    setIsResetting(true);
    setResetFailed(false);
    try {
      dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
      await CookieManager.clearAll(true);
      await Authentication.deleteWallet();
      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.RESET_WALLET_CONFIRMED,
        )
          .addProperties({})
          .build(),
      );
      InteractionManager.runAfterInteractions(() => {
        navigateOnboardingRoot();
      });
    } catch {
      setResetFailed(true);
      setIsResetting(false);
    }
  };

  return (
    <BottomSheet ref={modalRef} isInteractable={false}>
      <Box
        testID={WalletLockoutSelectors.CONTAINER}
        paddingHorizontal={4}
        gap={4}
      >
        <Text variant={TextVariant.HeadingMd}>
          {strings('login.lockout_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('login.lockout_description')}
        </Text>
        {resetFailed && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            testID={WalletLockoutSelectors.ERROR}
          >
            {strings('login.lockout_reset_error')}
          </Text>
        )}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('login.lockout_reset_button'),
          isDanger: true,
          size: ButtonSize.Lg,
          onPress: resetWallet,
          isLoading: isResetting,
          isDisabled: isResetting,
          testID: WalletLockoutSelectors.RESET_BUTTON,
        }}
        twClassName="pt-4"
      />
    </BottomSheet>
  );
};

export default WalletLockoutModal;
