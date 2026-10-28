import React from 'react';
import { Linking } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import { getErrorHandling } from '../../../../../util/identity/mfa/engine/errors';
import ContactSupportImage from '../../../../UI/Ramp/Views/VirtualBankAccount/assets/vba-account-create-failure.svg';
import { getSpecificErrorMessage } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

/**
 * An error only support can fix: the user contacts support, whose link carries
 * the error code so it can skip the support bot, or leaves.
 */
const ContactSupportStep = ({ step, onAction }: StepProps<'failure'>) => {
  const { openSupportWithConsent } = useSupportConsent();

  const contactSupport = () => {
    const url = new URL(METAMASK_SUPPORT_URL);
    url.searchParams.set('mfa_error', step.code);
    openSupportWithConsent((link) => Linking.openURL(link), url.toString());
  };

  return (
    <StepLayout
      isVerticallyCentered
      top={
        <Box twClassName="items-center">
          <ContactSupportImage name="mfa-contact-support" />
        </Box>
      }
      title={strings('mfa.failure.support_title')}
      description={strings('mfa.failure.support_description')}
      footer={
        <>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={contactSupport}
            testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
          >
            {strings('mfa.failure.contact_support')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => onAction({ type: 'dismiss' })}
            testID={MfaFlowSelectorsIDs.SECONDARY_BUTTON}
          >
            {strings('mfa.failure.done')}
          </Button>
        </>
      }
    />
  );
};

const FailureStep = (props: StepProps<'failure'>) => {
  const { step, state, onAction } = props;
  if (getErrorHandling(step.code) === 'support') {
    return <ContactSupportStep {...props} />;
  }
  return (
    <StepLayout
      isVerticallyCentered
      top={
        <AvatarIcon
          iconName={IconName.Danger}
          severity={AvatarIconSeverity.Danger}
          size={AvatarIconSize.Xl}
          twClassName="self-center"
        />
      }
      title={strings('mfa.failure.title')}
      // The title already says something went wrong; only a specific reason adds to it.
      description={getSpecificErrorMessage(step.code)}
      footer={
        <>
          {step.canRetry ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={state.busy}
              onPress={() => onAction({ type: 'retry' })}
              testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
            >
              {strings('mfa.failure.retry')}
            </Button>
          ) : null}
          <Button
            variant={
              step.canRetry ? ButtonVariant.Secondary : ButtonVariant.Primary
            }
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={state.busy}
            onPress={() => onAction({ type: 'dismiss' })}
            testID={MfaFlowSelectorsIDs.SECONDARY_BUTTON}
          >
            {strings('mfa.failure.close')}
          </Button>
        </>
      }
    />
  );
};

export default FailureStep;
