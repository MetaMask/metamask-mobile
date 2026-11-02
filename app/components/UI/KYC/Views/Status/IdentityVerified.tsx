import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import { navigateToVbaOnboardingDestination } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { VbaOnboardingRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import VbaIllustration, {
  VbaIllustrationSource,
} from '../../components/Illustration';

export const VbaIdentityVerifiedSelectorsIDs = {
  CONTAINER: 'vba-identity-verified-container',
  ILLUSTRATION: 'vba-identity-verified-illustration',
  BACK_BUTTON: 'vba-identity-verified-back-button',
  CONTINUE_BUTTON: 'vba-identity-verified-continue-button',
} as const;

/**
 * KYC approved, no usable autoramp yet. Continue opens Choose Currency when
 * `moneyMovementNeobank.chooseCurrency` is on, otherwise account details.
 * Back goes to Money home.
 */
const VbaIdentityVerified = () => {
  useTrackKycResultViewed('approved');
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { chooseCurrency } = useSelector(selectMoneyMovementNeobank);

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (chooseCurrency) {
      navigation.dispatch(
        StackActions.push(VbaOnboardingRoutes.CHOOSE_CURRENCY),
      );
      return;
    }
    navigateToVbaOnboardingDestination(navigation, 'complete');
  }, [chooseCurrency, navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaIdentityVerifiedSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 py-4')}
        testID={VbaIdentityVerifiedSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center}>
          <Box
            twClassName="mb-[24px]"
            testID={VbaIdentityVerifiedSelectorsIDs.ILLUSTRATION}
          >
            <VbaIllustration
              source={VbaIllustrationSource.checkmark}
              twClassName="h-[107px] w-[140px]"
            />
          </Box>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('virtual_bank_account.identity_verified.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-[4px] text-center"
          >
            {strings('virtual_bank_account.identity_verified.description')}
          </Text>
        </Box>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleContinue}
          testID={VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.identity_verified.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaIdentityVerified;
