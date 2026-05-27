import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../../../../util/theme';

import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
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
  /** Called when the user passes the funnel cleanly (no red-flag answers). The pending transaction should be confirmed immediately. */
  onConfirm: () => void;
  /** Called when the user taps "Stop this payment" on the warning screen. The pending transaction should be rejected. */
  onReject: () => void;
  /** Called when the user taps "I understand the risks, continue anyway" on the warning screen. The caller should return the user to the confirm screen, remember that they bypassed (so future Confirm taps skip the questionnaire), and mark the underlying alert as acknowledged. The tx is NOT submitted here — the user still has to tap Confirm on the send screen. */
  onBypass: () => void;
  /** Called when the user dismisses the questionnaire without finishing (back-button, swipe-down, system back). Caller stays on the confirm screen with the tx still pending. */
  onDismiss: () => void;
}

type Step = 0 | 1 | 2 | 'warning';

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
  onConfirm,
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
    if (step === 'warning' && !warningShownRef.current) {
      warningShownRef.current = true;
      metrics.trackWarningShown(answers);
    }
  }, [step, answers, metrics]);

  const handleBack = useCallback(() => {
    if (step === 'warning') {
      // Back from warning returns to the last question so the user can change an answer
      setStep(2);
      return;
    }
    if (step === 0) {
      metrics.trackDismissed(0, answers);
      onDismiss();
      return;
    }
    setPendingSelection(answers[QUESTION_DEFS[(step - 1) as 0 | 1].id]);
    setStep(((step as number) - 1) as Step);
  }, [step, answers, metrics, onDismiss]);

  const handleSelect = useCallback((option: QuestionOption) => {
    setPendingSelection(option);
  }, []);

  const handleContinue = useCallback(() => {
    if (step === 'warning' || !pendingSelection) {
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

    // Q3 answered — branch
    if (getRedFlagCount(nextAnswers) > 0) {
      setStep('warning');
    } else {
      metrics.trackCompletedClean();
      onConfirm();
    }
  }, [step, pendingSelection, answers, metrics, onConfirm]);

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
    metrics.trackDismissed(typeof step === 'number' ? step : 3, answers);
    onDismiss();
  }, [step, answers, metrics, onDismiss]);

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
              themeAppearance === 'light' ? 'dark-content' : 'light-content'
            }
            backgroundColor={colors.background.default}
          />
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <SecurityCheckHeader
              currentStep={typeof step === 'number' ? step : null}
              totalSteps={TOTAL_QUESTIONS}
              onBack={handleBack}
            />
            {typeof step === 'number' ? (
              (() => {
                const def = QUESTION_DEFS[step];
                return (
                  <QuestionScreen
                    iconName={def.icon}
                    title={strings(def.titleKey)}
                    subtitle={strings(def.subtitleKey)}
                    options={def.options}
                    selectedKey={pendingSelection?.key}
                    onSelect={handleSelect}
                    onContinue={handleContinue}
                  />
                );
              })()
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

export default ScamQuestionnaire;
