import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import KycIllustration, {
  KycIllustrationSource,
} from '../../components/Illustration';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export const KycIdentityVerifiedSelectorsIDs = {
  CONTAINER: 'kyc-identity-verified-container',
  ILLUSTRATION: 'kyc-identity-verified-illustration',
  BACK_BUTTON: 'kyc-identity-verified-back-button',
  CONTINUE_BUTTON: 'kyc-identity-verified-continue-button',
} as const;

interface KycIdentityVerifiedProps {
  /** Leaves the verified screen. The caller chooses the destination. */
  onExit: () => void;
  /** Continues after approval. The caller chooses the next step. */
  onContinue: () => void;
}

/**
 * KYC approved. Back and Continue are supplied by the caller.
 */
const KycIdentityVerified = ({
  onExit,
  onContinue,
}: KycIdentityVerifiedProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  useTrackKycResultViewed('approved');
  const tw = useTailwind();

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
        contentContainerStyle={tw.style('flex-grow justify-center px-4 py-4')}
        testID={KycIdentityVerifiedSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center}>
          <Box
            twClassName="mb-[24px]"
            testID={KycIdentityVerifiedSelectorsIDs.ILLUSTRATION}
          >
            <KycIllustration
              source={KycIllustrationSource.checkmark}
              twClassName="h-[107px] w-[140px]"
            />
          </Box>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('kyc.identity_verified.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-[4px] text-center"
          >
            {strings('kyc.identity_verified.description')}
          </Text>
        </Box>
      </ScrollView>
      <Box twClassName="p-4">
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
    </SafeAreaView>
  );
};

export default KycIdentityVerified;
