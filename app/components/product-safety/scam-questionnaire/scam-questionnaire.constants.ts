export const SCAM_QUESTIONNAIRE_FLAG_KEY =
  'productSafetyScamQuestionnaireEnabled';

export const SCAM_QUESTIONNAIRE_VARIANTS = {
  control: { showQuestionnaire: false },
  treatment: { showQuestionnaire: true },
} as const;

export const TOTAL_QUESTIONS = 3;

// Bump when the questions, answer options, or red-flag verdicts change.
export const QUESTIONNAIRE_VERSION = '1';

// Steps 0-2 are the questions; the final index is the warning screen.
export type Step = 0 | 1 | 2 | 3;

export type StepLabel = 'q1' | 'q2' | 'q3' | 'warning';

export function stepLabelFromIndex(step: Step): StepLabel {
  if (step === 0) {
    return 'q1';
  }
  if (step === 1) {
    return 'q2';
  }
  if (step === 2) {
    return 'q3';
  }
  return 'warning';
}

// Seconds the bypass ("continue anyway") link stays disabled on the scam
// warning screen, forcing the user to pause and read the warning before they
// can dismiss it.
export const PROCEED_DELAY_SECONDS = 10;

export type QuestionId = 'q1' | 'q2' | 'q3';

export interface QuestionOption {
  key: string;
  isRedFlag: boolean;
  titleKey: string;
  subtitleKey?: string;
}

export const Q1_OPTIONS: QuestionOption[] = [
  {
    key: 'q1_yes',
    isRedFlag: true,
    titleKey: 'scam_questionnaire.q1.yes',
  },
  {
    key: 'q1_no',
    isRedFlag: false,
    titleKey: 'scam_questionnaire.q1.no',
  },
];

export const Q2_OPTIONS: QuestionOption[] = [
  {
    key: 'q2_investment',
    isRedFlag: true,
    titleKey: 'scam_questionnaire.q2.investment_title',
    subtitleKey: 'scam_questionnaire.q2.investment_subtitle',
  },
  {
    key: 'q2_helping',
    isRedFlag: true,
    titleKey: 'scam_questionnaire.q2.helping_title',
    subtitleKey: 'scam_questionnaire.q2.helping_subtitle',
  },
  {
    key: 'q2_government',
    isRedFlag: true,
    titleKey: 'scam_questionnaire.q2.government_title',
    subtitleKey: 'scam_questionnaire.q2.government_subtitle',
  },
  {
    key: 'q2_job',
    isRedFlag: true,
    titleKey: 'scam_questionnaire.q2.job_title',
    subtitleKey: 'scam_questionnaire.q2.job_subtitle',
  },
  {
    key: 'q2_goods',
    isRedFlag: false,
    titleKey: 'scam_questionnaire.q2.goods_title',
    subtitleKey: 'scam_questionnaire.q2.goods_subtitle',
  },
  {
    key: 'q2_self_transfer',
    isRedFlag: false,
    titleKey: 'scam_questionnaire.q2.self_transfer_title',
    subtitleKey: 'scam_questionnaire.q2.self_transfer_subtitle',
  },
];

export const Q3_OPTIONS: QuestionOption[] = [
  {
    key: 'q3_yes',
    isRedFlag: true,
    titleKey: 'scam_questionnaire.q3.yes',
  },
  {
    key: 'q3_no',
    isRedFlag: false,
    titleKey: 'scam_questionnaire.q3.no',
  },
];

export type Answers = Partial<Record<QuestionId, QuestionOption>>;

export function getRedFlagCount(answers: Answers): number {
  return (Object.values(answers) as QuestionOption[]).filter(
    (a) => a?.isRedFlag,
  ).length;
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- These keys are sent
// verbatim as analytics properties, which segment-schema requires in snake_case.
export interface AnswerRecord {
  q1_answer: string | null;
  q2_answer: string | null;
  q3_answer: string | null;
}

// Unanswered questions report `null` rather than being omitted, so events
// distinguish "not reached" from "answered".
// eslint-disable-next-line @typescript-eslint/naming-convention
export function getAnswerRecord(answers: Answers): AnswerRecord {
  return {
    q1_answer: answers.q1?.key ?? null,
    q2_answer: answers.q2?.key ?? null,
    q3_answer: answers.q3?.key ?? null,
  };
}

export function getRedFlagQuestions(answers: Answers): QuestionId[] {
  return (Object.entries(answers) as [QuestionId, QuestionOption][])
    .filter(([, a]) => a?.isRedFlag)
    .map(([q]) => q);
}
