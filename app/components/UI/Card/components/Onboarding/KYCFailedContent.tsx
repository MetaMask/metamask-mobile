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
  /** Immersve final copy. Baanx omits both and keeps the default copy. */
  title?: string;
  description?: string;
  /** Adds a Contact support button when set. */
  onContactSupport?: () => void;
}

/**
 * Final KYC body: the failure illustration, copy, Back to home, and optional
 * Contact support.
 * Shared by the KYCFailed screen and the Immersve KYC result, which swaps this
 * in without leaving the screen. No tracking and no navigation.
 */
const KYCFailedContent = ({
  onClose,
  title,
  description,
  onContactSupport,
}: KYCFailedContentProps) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('flex-1')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={title ?? strings('card.card_onboarding.kyc_failed.title')}
          bottomLabel={
            description ??
            strings('card.card_onboarding.kyc_failed.description')
          }
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
        {onContactSupport ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={onContactSupport}
            isFullWidth
            testID="kyc-failed-contact-support-button"
          >
            {strings('card.card_home.contact_support')}
          </Button>
        ) : null}
      </Box>
    </View>
  );
};

export default KYCFailedContent;
