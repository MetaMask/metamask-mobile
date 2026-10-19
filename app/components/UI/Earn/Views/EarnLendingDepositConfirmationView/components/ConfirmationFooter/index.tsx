import React from 'react';
import { useStyles } from '../../../../../../../component-library/hooks';
import { Linking, View } from 'react-native';
import {
  BottomSheetFooter,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import AppConstants from '../../../../../../../core/AppConstants';
import ProgressStepper, { ProgressStep } from '../ProgressStepper';
import styleSheet from './ConfirmationFooter.styles';
import {
  CONFIRMATION_FOOTER_TEST_ID,
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_LINK_TEST_IDS,
} from './ConfirmationFooter.testIds';

export {
  CONFIRMATION_FOOTER_TEST_ID,
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_LINK_TEST_IDS,
} from './ConfirmationFooter.testIds';

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

export const ConfirmationFooter = ({
  onConfirm,
  onCancel,
  buttonPrimary,
  buttonSecondary,
  progressBar,
}: ConfirmationFooterProps) => {
  const { styles, theme } = useStyles(styleSheet, {
    hasProgressBar: Boolean(progressBar),
  });

  const secondaryButtonProps = {
    children: buttonSecondary?.text ?? strings('confirm.cancel'),
    isDisabled: Boolean(buttonSecondary?.disabled),
    size: ButtonSize.Lg,
    onPress: onCancel,
    testID: CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
  };

  const primaryButtonProps = {
    isDisabled: Boolean(buttonPrimary?.disabled),
    children: buttonPrimary?.text ?? strings('confirm.confirm'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
    testID: CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
  };

  return (
    <View style={styles.footerContainer} testID={CONFIRMATION_FOOTER_TEST_ID}>
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
        secondaryButtonProps={secondaryButtonProps}
        primaryButtonProps={primaryButtonProps}
        twClassName="py-3"
        style={styles.footerButtonsContainer}
      />
      <View style={styles.bottomTextContainer}>
        <View style={styles.bottomTextContainerLine}>
          <Text variant={TextVariant.BodySm}>
            {strings('confirm.staking_footer.part1')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
            testID={CONFIRMATION_FOOTER_LINK_TEST_IDS.TERMS_OF_USE_BUTTON}
          >
            {strings('confirm.staking_footer.terms_of_use')}
          </Text>
        </View>
        <View style={styles.bottomTextContainerLine}>
          <Text variant={TextVariant.BodySm}>
            {strings('confirm.staking_footer.part2')}
            {'\n'}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            style={styles.linkText}
            onPress={() =>
              Linking.openURL(AppConstants.URLS.EARN_RISK_DISCLOSURE)
            }
            testID={CONFIRMATION_FOOTER_LINK_TEST_IDS.RISK_DISCLOSURE_BUTTON}
          >
            {strings('confirm.staking_footer.risk_disclosure')}
          </Text>
          <Text variant={TextVariant.BodySm}>
            {strings('confirm.staking_footer.part3')}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ConfirmationFooter;
