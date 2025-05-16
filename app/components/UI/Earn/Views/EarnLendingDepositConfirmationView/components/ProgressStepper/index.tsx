import React, { useMemo, useCallback } from 'react';
import { ColorValue, Dimensions, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import AvatarBase from '../../../../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import {
  IconColor,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import Loader from '../../../../../../../component-library/components-temp/Loader';
import styleSheet from './ProgressStepper.styles';

export interface ProgressStep {
  label: string;
  isLoading: boolean;
}

export interface ProgressStepperProps {
  height?: number;
  stroke?: ColorValue;
  strokeWidth?: number;
  steps: ProgressStep[];
  activeStep: number;
}

const prefix = 'progress-stepper';

export const PROGRESS_STEPPER_TEST_IDS = {
  STEP: `${prefix}-step`,
  STEP_ICON: {
    COMPLETED: `${prefix}-step-icon-completed`,
    LOADING: `${prefix}-step-icon-loading`,
    PENDING: `${prefix}-step-icon-pending`,
  },
  PROGRESS_BAR: `${prefix}-progress-bar`,
};

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
            testID={PROGRESS_STEPPER_TEST_IDS.STEP_ICON.COMPLETED}
          />
        );
      }

      if (isLoading) {
        return (
          <AvatarBase
            style={styles.completeStep}
            size={AvatarSize.Sm}
            testID={PROGRESS_STEPPER_TEST_IDS.STEP_ICON.LOADING}
          >
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
            testID={PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING}
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
          testID={PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR}
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
            testID={`${PROGRESS_STEPPER_TEST_IDS.STEP}-${index}`}
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

export default ProgressStepper;
