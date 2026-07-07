import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';

import { IconName } from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import {
  Answers,
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  QuestionId,
  QuestionOption,
  TOTAL_QUESTIONS,
  getRedFlagCount,
} from './scam-questionnaire.constants';
import { SecurityCheckHeader } from './security-check-header';
import { QuestionScreen } from './question-screen';
import { ScamWarning } from './scam-warning';
import { useScamQuestionnaireMetrics } from './useScamQuestionnaireMetrics';
import styleSheet from './scam-questionnaire.styles';

export interface ScamQuestionnaireProps {
  /** User answered with no red flags. */
  onCleanPass: () => void;
  /** User chose "Stop this payment" on the warning. */
  onReject: () => void;
  /** User chose to continue past the warning. */
  onBypass: () => void;
  /** User dismissed without finishing (back / swipe / system back). */
  onDismiss: () => void;
}

// Steps 0-2 are the questions; the final index is the warning screen.
type Step = 0 | 1 | 2 | 3;
const WARNING_STEP = TOTAL_QUESTIONS;

const QUESTION_DEFS: Record<
  0 | 1 | 2,
  {
    id: QuestionId;
    icon: IconName;
    titleKey: string;
    subtitleKey: string;
    options: QuestionOption[];
  }
> = {
  0: {
    id: 'q1',
    icon: IconName.Messages,
    titleKey: 'scam_questionnaire.q1.title',
    subtitleKey: 'scam_questionnaire.q1.subtitle',
    options: Q1_OPTIONS,
  },
  1: {
    id: 'q2',
    icon: IconName.Coin,
    titleKey: 'scam_questionnaire.q2.title',
    subtitleKey: 'scam_questionnaire.q2.subtitle',
    options: Q2_OPTIONS,
  },
  2: {
    id: 'q3',
    icon: IconName.Call,
    titleKey: 'scam_questionnaire.q3.title',
    subtitleKey: 'scam_questionnaire.q3.subtitle',
    options: Q3_OPTIONS,
  },
};

export const ScamQuestionnaire: React.FC<ScamQuestionnaireProps> = ({
  onCleanPass,
  onReject,
  onBypass,
  onDismiss,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { themeAppearance, colors } = useTheme();
  const metrics = useScamQuestionnaireMetrics();

  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({});
  // Per-step in-progress selection so the Continue button stays disabled until tapped
  const [pendingSelection, setPendingSelection] = useState<
    QuestionOption | undefined
  >();

  const startedRef = useRef(false);
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      metrics.trackStarted();
    }
  }, [metrics]);

  const warningShownRef = useRef(false);
  useEffect(() => {
    if (step === WARNING_STEP && !warningShownRef.current) {
      warningShownRef.current = true;
      metrics.trackWarningShown(answers);
    }
  }, [step, answers, metrics]);

  const handleBack = useCallback(() => {
    if (step === WARNING_STEP) {
      setStep((WARNING_STEP - 1) as Step);
      return;
    }
    if (step === 0) {
      metrics.trackDismissed(0, answers);
      onDismiss();
      return;
    }
    const prevStep = (step - 1) as 0 | 1;
    setPendingSelection(answers[QUESTION_DEFS[prevStep].id]);
    setStep(prevStep);
  }, [step, answers, metrics, onDismiss]);

  const handleSelect = useCallback((option: QuestionOption) => {
    setPendingSelection(option);
  }, []);

  const handleContinue = useCallback(() => {
    if (step === WARNING_STEP || !pendingSelection) {
      return;
    }
    const def = QUESTION_DEFS[step];
    const nextAnswers: Answers = {
      ...answers,
      [def.id]: pendingSelection,
    };
    setAnswers(nextAnswers);
    metrics.trackQuestionAnswered(
      def.id,
      pendingSelection.key,
      pendingSelection.isRedFlag,
    );

    if (step < TOTAL_QUESTIONS - 1) {
      const nextStep = (step + 1) as 0 | 1 | 2;
      setPendingSelection(answers[QUESTION_DEFS[nextStep].id]);
      setStep(nextStep);
      return;
    }

    // Final question answered — branch to the warning or pass cleanly.
    if (getRedFlagCount(nextAnswers) > 0) {
      setStep(WARNING_STEP);
    } else {
      metrics.trackCompletedClean();
      onCleanPass();
    }
  }, [step, pendingSelection, answers, metrics, onCleanPass]);

  const handleStop = useCallback(() => {
    metrics.trackWarningStopped(answers);
    onReject();
  }, [answers, metrics, onReject]);

  const handleContactSupport = useCallback(() => {
    metrics.trackWarningContactSupport(answers);
  }, [answers, metrics]);

  const handleProceed = useCallback(() => {
    metrics.trackWarningProceeded(answers);
    onBypass();
  }, [answers, metrics, onBypass]);

  const handleRequestClose = useCallback(() => {
    metrics.trackDismissed(step, answers);
    onDismiss();
  }, [step, answers, metrics, onDismiss]);

  const questionDef = step === WARNING_STEP ? null : QUESTION_DEFS[step];

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleRequestClose}
      testID="scam-questionnaire-modal"
    >
      <SafeAreaProvider>
        <View style={styles.fullBleed}>
          <StatusBar
            barStyle={
              themeAppearance === AppThemeKey.light
                ? 'dark-content'
                : 'light-content'
            }
            backgroundColor={colors.background.default}
          />
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <SecurityCheckHeader
              currentStep={step === WARNING_STEP ? null : step}
              totalSteps={TOTAL_QUESTIONS}
              onBack={handleBack}
            />
            {questionDef ? (
              <QuestionScreen
                iconName={questionDef.icon}
                title={strings(questionDef.titleKey)}
                subtitle={strings(questionDef.subtitleKey)}
                options={questionDef.options}
                selectedKey={pendingSelection?.key}
                onSelect={handleSelect}
                onContinue={handleContinue}
              />
            ) : (
              <ScamWarning
                onStop={handleStop}
                onContactSupport={handleContactSupport}
                onProceed={handleProceed}
              />
            )}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
};
