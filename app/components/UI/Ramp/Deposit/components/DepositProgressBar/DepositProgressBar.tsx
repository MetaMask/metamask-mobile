import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './DepositProgressBar.styles';
import { DEPOSIT_PROGRESS_BAR_TEST_IDS } from './DepositProgressBar.testIds';

interface ProgressBarProps {
  steps: number;
  currentStep: number;
}

const DepositProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  currentStep,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={styles.container}
      testID={DEPOSIT_PROGRESS_BAR_TEST_IDS.CONTAINER}
    >
      {Array.from({ length: steps }, (_, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        let stepStyle;

        if (isCompleted) {
          stepStyle = [styles.step, styles.completedStep];
        } else if (isCurrent) {
          stepStyle = [styles.step, styles.currentStep];
        } else {
          stepStyle = [styles.step, styles.todoStep];
        }

        const gapStyle = index < steps - 1 ? styles.stepGap : undefined;

        return (
          <View
            key={index}
            style={[stepStyle, gapStyle]}
            testID={`${DEPOSIT_PROGRESS_BAR_TEST_IDS.STEP_PREFIX}${index}`}
          />
        );
      })}
    </View>
  );
};

export default DepositProgressBar;
