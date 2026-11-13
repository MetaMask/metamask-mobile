import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import useVerifiedSuccessCascade from '../../hooks/useVerifiedSuccessCascade';
import VerifiedCheckAnimation from '../../components/VerifiedCheckAnimation';
import MarketingMomentTitle from '../../../MarketingMomentTitle';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export const KycIdentityVerifiedSelectorsIDs = {
  CONTAINER: 'kyc-identity-verified-container',
  ILLUSTRATION: 'kyc-identity-verified-illustration',
  BACK_BUTTON: 'kyc-identity-verified-back-button',
  FOOTER: 'kyc-identity-verified-footer',
  CONTINUE_BUTTON: 'kyc-identity-verified-continue-button',
} as const;

interface KycIdentityVerifiedProps {
  /** Leaves the verified screen. The caller chooses the destination. */
  onExit: () => void;
  /** Continues after approval. The caller chooses the next step. */
  onContinue: () => void;
}

/**
 * KYC approved. Back and Continue are supplied by the caller. Uses Card's
 * You're verified pattern: Rive tick, then the copy and button cascade in.
 */
const KycIdentityVerified = ({
  onExit,
  onContinue,
}: KycIdentityVerifiedProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  useTrackKycResultViewed('approved');
  const tw = useTailwind();
  const {
    mode,
    startEntrance,
    titleStyle,
    descriptionStyle,
    buttonStyle,
    isButtonInteractive,
  } = useVerifiedSuccessCascade();

  const handleBack = useCallback(() => {
    onExit();
  }, [onExit]);

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

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
              twClassName="mb-5 w-full"
              testID={KycIdentityVerifiedSelectorsIDs.ILLUSTRATION}
            >
              <VerifiedCheckAnimation
                mode={mode}
                onEntranceStart={startEntrance}
              />
            </Box>
          }
        />
      </ScrollView>
      <Animated.View
        style={buttonStyle}
        pointerEvents={isButtonInteractive ? 'auto' : 'none'}
        testID={KycIdentityVerifiedSelectorsIDs.FOOTER}
      >
        <Box twClassName="px-4 pb-2 pt-4">
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
