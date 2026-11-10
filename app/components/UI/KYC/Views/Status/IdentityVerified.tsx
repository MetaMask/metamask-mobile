import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import useVerifiedSuccessCascade from '../../hooks/useVerifiedSuccessCascade';
import { openVbaAccountSetup } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import VerifiedCheckAnimation from '../../components/VerifiedCheckAnimation';
import MarketingMomentTitle from '../../../MarketingMomentTitle';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export const KycIdentityVerifiedSelectorsIDs = {
  CONTAINER: 'kyc-identity-verified-container',
  ILLUSTRATION: 'kyc-identity-verified-illustration',
  BACK_BUTTON: 'kyc-identity-verified-back-button',
  CONTINUE_BUTTON: 'kyc-identity-verified-continue-button',
} as const;

/**
 * KYC approved, no usable autoramp yet. Continue opens Choose Currency when
 * `moneyMovementNeobank.chooseCurrency` is on, otherwise account details.
 * Back goes to Money home. Visual layout matches Card's You're verified
 * success pattern (MarketingMomentTitle, Rive tick, content cascade).
 */
const KycIdentityVerified = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  useTrackKycResultViewed('approved');
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { chooseCurrency } = useSelector(selectMoneyMovementNeobank);
  const {
    titleStyle,
    descriptionStyle,
    buttonStyle,
    isButtonInteractive,
    checkMode,
    startEntrance,
  } = useVerifiedSuccessCascade();

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleContinue = useCallback(() => {
    openVbaAccountSetup(navigation, chooseCurrency);
  }, [chooseCurrency, navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        onBack={handleBack}
        backButtonProps={{
          testID: KycIdentityVerifiedSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
        testID={KycIdentityVerifiedSelectorsIDs.CONTAINER}
      >
        <TitleStandard
          title={
            <Animated.View style={[tw.style('w-full'), titleStyle]}>
              <MarketingMomentTitle twClassName="w-full text-center">
                {strings('kyc.identity_verified.title')}
              </MarketingMomentTitle>
            </Animated.View>
          }
          bottomLabel={
            <Animated.View style={[tw.style('w-full'), descriptionStyle]}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {strings('kyc.identity_verified.description')}
              </Text>
            </Animated.View>
          }
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.End}
              twClassName="mb-5 w-full"
              testID={KycIdentityVerifiedSelectorsIDs.ILLUSTRATION}
            >
              <VerifiedCheckAnimation
                mode={checkMode}
                onEntranceStart={startEntrance}
                onRiveError={startEntrance}
              />
            </Box>
          }
        />
      </ScrollView>
      <Animated.View
        style={buttonStyle}
        pointerEvents={isButtonInteractive ? 'auto' : 'none'}
      >
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleContinue}
            testID={KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON}
          >
            {strings('kyc.identity_verified.button')}
          </Button>
        </Box>
      </Animated.View>
    </SafeAreaView>
  );
};

export default KycIdentityVerified;
