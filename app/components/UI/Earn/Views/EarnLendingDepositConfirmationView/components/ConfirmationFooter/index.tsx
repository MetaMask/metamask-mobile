import React from 'react';
import { useStyles } from '../../../../../../../component-library/hooks';
import { Linking, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../../locales/i18n';
import AppConstants from '../../../../../../../core/AppConstants';
import ProgressStepper, { ProgressStep } from '../ProgressStepper';
import styleSheet from './ConfirmationFooter.styles';

interface FooterButton {
  text?: string;
  disabled?: boolean;
}

export interface ConfirmationFooterProps {
  onConfirm: () => void;
  onCancel: () => void;
  buttonPrimary?: FooterButton;
  buttonSecondary?: FooterButton;
  progressBar?: { activeStep: number; steps: ProgressStep[] };
}

export const CONFIRMATION_FOOTER_TEST_IDS = 'confirmationFooter';

export const CONFIRMATION_FOOTER_BUTTON_TEST_IDS = {
  CANCEL_BUTTON: 'earn-lending-confirmation-footer-cancel-button',
  CONFIRM_BUTTON: 'earn-lending-confirmation-footer-confirm-button',
};

const ConfirmationFooter = ({
  onConfirm,
  onCancel,
  buttonPrimary,
  buttonSecondary,
  progressBar,
}: ConfirmationFooterProps) => {
  const { styles, theme } = useStyles(styleSheet, {
    hasProgressBar: Boolean(progressBar),
  });

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: buttonSecondary?.text ?? strings('confirm.cancel'),
      isDisabled: Boolean(buttonSecondary?.disabled),
      size: ButtonSize.Lg,
      onPress: onCancel,
      testID: CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDisabled: Boolean(buttonPrimary?.disabled),
      label: buttonPrimary?.text ?? strings('confirm.confirm'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
      testID: CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    },
  ];

  return (
    <View style={styles.footerContainer} testID={CONFIRMATION_FOOTER_TEST_IDS}>
      {progressBar && (
        <View>
          <ProgressStepper
            stroke={theme.colors.primary.default}
            strokeWidth={1}
            activeStep={progressBar.activeStep}
            steps={progressBar.steps}
          />
        </View>
      )}
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={buttons}
        style={styles.footerButtonsContainer}
      />
      <View style={styles.bottomTextContainer}>
        <View style={styles.bottomTextContainerLine}>
          <Text variant={TextVariant.BodySM}>
            {strings('confirm.staking_footer.part1')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
          >
            {strings('confirm.staking_footer.terms_of_use')}
          </Text>
        </View>
        <View style={styles.bottomTextContainerLine}>
          <Text variant={TextVariant.BodySM}>
            {strings('confirm.staking_footer.part2')}
            {'\n'}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() =>
              Linking.openURL(AppConstants.URLS.STAKING_RISK_DISCLOSURE)
            }
          >
            {strings('confirm.staking_footer.risk_disclosure')}
          </Text>
          <Text variant={TextVariant.BodySM}>
            {strings('confirm.staking_footer.part3')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ConfirmationFooter;
