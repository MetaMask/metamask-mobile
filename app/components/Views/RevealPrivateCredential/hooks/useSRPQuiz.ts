import { useCallback, useEffect, useState } from 'react';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useMetrics } from '../../../../components/hooks/useMetrics';
import { RevealSrpStage } from '../types';

interface UseSRPQuizReturn {
  revealSrpStage: RevealSrpStage;
  currentQuestionIndex: number;
  questionAnswered: boolean;
  correctAnswer: boolean;
  handleGetStartedClick: () => void;
  handleQuestionAnswerClick: (buttonIndex: number) => void;
  handleAnsweredQuestionClick: () => void;
}

interface UseSRPQuizProps {
  /** When set, start at this stage (e.g. ActionViewScreen when quiz was completed in modal) */
  initialStage?: RevealSrpStage;
}

const useSRPQuiz = (options: UseSRPQuizProps = {}): UseSRPQuizReturn => {
  const { initialStage } = options;
  const [revealSrpStage, setRevealSrpStage] = useState<RevealSrpStage>(
    initialStage ?? RevealSrpStage.Introduction,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(1);
  const [questionAnswered, setQuestionAnswered] = useState<boolean>(false);
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(false);

  const { trackEvent, createEventBuilder } = useMetrics();

  // Track when introduction screen is shown
  useEffect(() => {
    if (revealSrpStage === RevealSrpStage.Introduction) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.SRP_REVEAL_QUIZ_PROMPT_SEEN,
        ).build(),
      );
    }
  }, [revealSrpStage, trackEvent, createEventBuilder]);

  // Track when questions are shown
  useEffect(() => {
    if (revealSrpStage === RevealSrpStage.Quiz && !questionAnswered) {
      if (currentQuestionIndex === 1) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_SEEN,
          ).build(),
        );
      } else if (currentQuestionIndex === 2) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_SEEN,
          ).build(),
        );
      }
    }
  }, [
    revealSrpStage,
    currentQuestionIndex,
    questionAnswered,
    trackEvent,
    createEventBuilder,
  ]);

  const handleGetStartedClick = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVEAL_SRP_INITIATED).build(),
    );
    trackEvent(createEventBuilder(MetaMetricsEvents.REVEAL_SRP_CTA).build());
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_START_CTA_SELECTED,
      ).build(),
    );
    setRevealSrpStage(RevealSrpStage.Quiz);
  }, [createEventBuilder, trackEvent]);

  const handleQuestionAnswerClick = useCallback(
    (buttonIndex: number) => {
      let isCorrect = false;
      if (currentQuestionIndex === 1) {
        isCorrect = buttonIndex === 2;
        setCorrectAnswer(isCorrect);
        // Track Q1 answer selection
        if (isCorrect) {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER,
            ).build(),
          );
        } else {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER,
            ).build(),
          );
        }
      } else {
        isCorrect = buttonIndex === 1;
        setCorrectAnswer(isCorrect);
        // Track Q2 answer selection
        if (isCorrect) {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER,
            ).build(),
          );
        } else {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER,
            ).build(),
          );
        }
      }
      setQuestionAnswered(true);
    },
    [currentQuestionIndex, trackEvent, createEventBuilder],
  );

  const handleAnsweredQuestionClick = useCallback(() => {
    if (currentQuestionIndex === 1 && correctAnswer) {
      setCurrentQuestionIndex(2);
    } else if (currentQuestionIndex === 2 && correctAnswer) {
      setRevealSrpStage(RevealSrpStage.ActionViewScreen);
    }
    setQuestionAnswered(false);
  }, [currentQuestionIndex, correctAnswer]);

  return {
    revealSrpStage,
    currentQuestionIndex,
    questionAnswered,
    correctAnswer,
    handleGetStartedClick,
    handleQuestionAnswerClick,
    handleAnsweredQuestionClick,
  };
};

export default useSRPQuiz;
