import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import VbaAccountCreateFailure from '../../../Ramp/Views/VirtualBankAccount/assets/vba-account-create-failure.svg';

interface KYCFailedContentProps {
  /** Back to home. The caller decides whether that is a header arrow or this button. */
  onClose: () => void;
}

/**
 * "Not eligible" body: the failure illustration, copy, and Back to home button.
 * Shared by the KYCFailed screen and the Immersve KYC result, which swaps this
 * in without leaving the screen. No tracking and no navigation.
 */
const KYCFailedContent = ({ onClose }: KYCFailedContentProps) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('flex-1')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={strings('card.card_onboarding.kyc_failed.title')}
          bottomLabel={strings('card.card_onboarding.kyc_failed.description')}
          titleProps={{
            twClassName: 'text-center',
            testID: 'kyc-failed-title',
          }}
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelProps={{
            twClassName: 'text-center',
            testID: 'kyc-failed-description',
          }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.End}
              twClassName="mb-5 w-full"
              testID="kyc-failed-illustration"
            >
              <VbaAccountCreateFailure name="vba-account-create-failure" />
            </Box>
          }
        />
      </ScrollView>
      <Box gap={2} paddingHorizontal={4} paddingTop={4} paddingBottom={2}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onClose}
          isFullWidth
          testID="kyc-failed-close-button"
        >
          {strings('card.card_onboarding.kyc_failed.close_button')}
        </Button>
      </Box>
    </View>
  );
};

export default KYCFailedContent;
