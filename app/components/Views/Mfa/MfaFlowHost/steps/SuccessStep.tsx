import React, { useEffect } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

export const SUCCESS_AUTO_CLOSE_MS = 1500;

const SuccessStep = ({ onAction }: StepProps<'success'>) => {
  useEffect(() => {
    const id = setTimeout(
      () => onAction({ type: 'dismiss' }),
      SUCCESS_AUTO_CLOSE_MS,
    );
    return () => clearTimeout(id);
  }, [onAction]);

  return (
    <StepLayout
      top={
        <Icon
          name={IconName.Confirmation}
          color={IconColor.SuccessDefault}
          size={IconSize.Xl}
        />
      }
      title={strings('mfa.success.title')}
      footer={
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() => onAction({ type: 'dismiss' })}
          testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
        >
          {strings('mfa.success.done')}
        </Button>
      }
    />
  );
};

export default SuccessStep;
