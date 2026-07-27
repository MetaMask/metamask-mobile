export const TOTAL_QUESTIONS = 3;

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

export function getRedFlagQuestions(answers: Answers): QuestionId[] {
  return (Object.entries(answers) as [QuestionId, QuestionOption][])
    .filter(([, a]) => a?.isRedFlag)
    .map(([q]) => q);
}
