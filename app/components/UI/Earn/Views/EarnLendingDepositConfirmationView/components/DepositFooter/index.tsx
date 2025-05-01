import React, { useCallback, useMemo } from 'react';
import styleSheet from './DepositFooter.styles';
import { useStyles } from '../../../../../../../component-library/hooks';
import { ColorValue, Linking, View, Dimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import AvatarBase from '../../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import Text, {
  TextColor,
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
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import {
  IconColor,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon';
import Loader from '../../../../../../../component-library/components-temp/Loader';

interface ProgressStep {
  label: string;
  isLoading: boolean;
}

interface ProgressStepperProps {
  height?: number;
  stroke?: ColorValue;
  strokeWidth?: number;
  steps: ProgressStep[];
  activeStep: number;
}

const ProgressStepper = ({
  height = 10,
  stroke = 'black',
  strokeWidth = 1,
  steps,
  activeStep,
}: ProgressStepperProps) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const progressBarWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;

    // We want an additional segment to display progress before and after steps.
    const numSegments = steps.length + 1;

    const segmentWidth = screenWidth / numSegments;

    // activeStep[0] is valid so we add 1
    return segmentWidth * (activeStep + 1);
  }, [activeStep, steps.length]);

  const isCompletedStep = useCallback(
    (index: number) => activeStep >= index,
    [activeStep],
  );

  const isActiveStep = useCallback(
    (index: number) => index === activeStep,
    [activeStep],
  );

  const getStepIcon = useCallback(
    (index: number, isLoading: boolean) => {
      if (isCompletedStep(index) && !isActiveStep(index) && !isLoading) {
        return (
          <Avatar
            variant={AvatarVariant.Icon}
            name={IconName.Check}
            iconColor={IconColor.Inverse}
            size={AvatarSize.Sm}
            backgroundColor={theme.colors.primary.default}
          />
        );
      }

      if (isLoading) {
        return (
          <AvatarBase style={styles.completeStep} size={AvatarSize.Sm}>
            <View>
              <Loader color={theme.colors.primary.inverse} size={'small'} />
            </View>
          </AvatarBase>
        );
      }

      return (
        <AvatarBase
          style={
            isCompletedStep(index) ? styles.completeStep : styles.incompleteStep
          }
          size={AvatarSize.Sm}
        >
          <Text
            color={
              isCompletedStep(index) ? TextColor.Inverse : TextColor.Primary
            }
            variant={TextVariant.BodySM}
          >
            {index + 1}
          </Text>
        </AvatarBase>
      );
    },
    [
      isActiveStep,
      isCompletedStep,
      styles.completeStep,
      styles.incompleteStep,
      theme.colors.primary.default,
      theme.colors.primary.inverse,
    ],
  );

  return (
    <View>
      <Svg height={height} width={'auto'}>
        <Line
          x1="0"
          y1="5"
          x2={progressBarWidth}
          y2="5"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Line
          x1="0"
          y1="5"
          x2="100%"
          y2="5"
          stroke={theme.colors.primary.muted}
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.allStepsContainer}>
        {steps.map(({ label, isLoading }, index) => (
          <View
            style={styles.stepContainer}
            key={`earn-progress-step-${label}-${index}`}
          >
            {getStepIcon(index, isLoading)}
            <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface FooterButton {
  text?: string;
  disabled?: boolean;
}

interface DepositFooterProps {
  onConfirm: () => void;
  onCancel: () => void;
  buttonPrimary?: FooterButton;
  buttonSecondary?: FooterButton;
  activeStep: number;
  steps: ProgressStep[];
}

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
      testID: 'cancel-button',
    },
    {
      variant: ButtonVariants.Primary,
      isDisabled: Boolean(buttonPrimary?.disabled),
      label: buttonPrimary?.text ?? strings('confirm.confirm'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
      testID: 'confirm-button',
    },
  ];

  return (
    <View style={styles.footerContainer}>
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
