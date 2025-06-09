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
import styleSheet from './DepositFooter.styles';

interface FooterButton {
  text?: string;
  disabled?: boolean;
}

export interface DepositFooterProps {
  onConfirm: () => void;
  onCancel: () => void;
  buttonPrimary?: FooterButton;
  buttonSecondary?: FooterButton;
  activeStep: number;
  steps: ProgressStep[];
}

export const DEPOSIT_FOOTER_TEST_ID = 'depositFooter';

export const LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS = {
  CANCEL_BUTTON: 'earn-lending-deposit-confirmation-footer-cancel-button',
  CONFIRM_BUTTON: 'earn-lending-deposit-confirmation-footer-confirm-button',
};

const DepositFooter = ({
  onConfirm,
  onCancel,
  buttonPrimary,
  buttonSecondary,
  activeStep,
  steps,
}: DepositFooterProps) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const buttons = [
    {
      variant: ButtonVariants.Secondary,
      label: buttonSecondary?.text ?? strings('confirm.cancel'),
      isDisabled: Boolean(buttonSecondary?.disabled),
      size: ButtonSize.Lg,
      onPress: onCancel,
      testID: LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    },
    {
      variant: ButtonVariants.Primary,
      isDisabled: Boolean(buttonPrimary?.disabled),
      label: buttonPrimary?.text ?? strings('confirm.confirm'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
      testID: LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    },
  ];

  return (
    <View style={styles.footerContainer} testID={DEPOSIT_FOOTER_TEST_ID}>
      <View>
        <ProgressStepper
          stroke={theme.colors.primary.default}
          strokeWidth={1}
          activeStep={activeStep}
          steps={steps}
        />
      </View>
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

export default DepositFooter;
