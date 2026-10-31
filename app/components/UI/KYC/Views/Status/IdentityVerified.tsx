import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { strings } from '../../../../../../locales/i18n';
import VbaIllustration, {
  VbaIllustrationSource,
} from '../../components/Illustration';

export const VbaIdentityVerifiedSelectorsIDs = {
  CONTAINER: 'vba-identity-verified-container',
  ILLUSTRATION: 'vba-identity-verified-illustration',
  BACK_BUTTON: 'vba-identity-verified-back-button',
  CONTINUE_BUTTON: 'vba-identity-verified-continue-button',
} as const;

interface VbaIdentityVerifiedProps {
  onBack: () => void;
  onContinue: () => void;
}

/** KYC approved. The host decides where Back and Continue lead. */
const VbaIdentityVerified = ({
  onBack,
  onContinue,
}: VbaIdentityVerifiedProps) => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={onBack}
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
          onPress={onContinue}
          testID={VbaIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.identity_verified.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaIdentityVerified;
