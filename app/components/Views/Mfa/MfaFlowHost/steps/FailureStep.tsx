import React from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import { getErrorHandling } from '../../../../../util/identity/mfa/engine/errors';
import FailureImage from '../../../../../images/mfa-failure.svg';
import { getFailureCopy } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

/**
 * The screen a flow ends on when it fails. An error only support can fix
 * offers to contact support, whose link carries the error code so it can skip
 * the support bot.
 */
const FailureStep = ({ step, state, onAction }: StepProps<'failure'>) => {
  const { openSupportWithConsent } = useSupportConsent();
  const { title, description } = getFailureCopy(step.code);

  const contactSupport = () => {
    const url = new URL(METAMASK_SUPPORT_URL);
    url.searchParams.set('mfa_error', step.code);
    openSupportWithConsent((link) => Linking.openURL(link), url.toString());
  };
  const dismiss = () => onAction({ type: 'dismiss' });
  const retry = () => onAction({ type: 'retry' });

  const renderFooter = () => {
    if (getErrorHandling(step.code) === 'support') {
      return (
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
            onPress={dismiss}
            testID={MfaFlowSelectorsIDs.SECONDARY_BUTTON}
          >
            {strings('mfa.failure.done')}
          </Button>
        </>
      );
    }
    // The header's back button leaves, so a retry is the only action.
    return step.canRetry ? (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isLoading={state.busy}
        onPress={retry}
        testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
      >
        {strings('mfa.failure.retry')}
      </Button>
    ) : (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={dismiss}
        testID={MfaFlowSelectorsIDs.SECONDARY_BUTTON}
      >
        {strings('mfa.failure.close')}
      </Button>
    );
  };

  return (
    <StepLayout
      isVerticallyCentered
      top={
        <Box twClassName="items-center">
          <FailureImage name="mfa-failure" />
        </Box>
      }
      title={title}
      description={description}
      footer={renderFooter()}
    />
  );
};

export default FailureStep;
