import {
  Answers,
  Q1_OPTIONS,
  Q2_OPTIONS,
  Q3_OPTIONS,
  getRedFlagCount,
  getRedFlagQuestions,
} from './scam-questionnaire.constants';

describe('scam-questionnaire.constants', () => {
  describe('Q1_OPTIONS', () => {
    it('marks the "yes" answer as a red flag and the "no" answer as not', () => {
      const yes = Q1_OPTIONS.find((o) => o.key === 'q1_yes');
      const no = Q1_OPTIONS.find((o) => o.key === 'q1_no');
      expect(yes?.isRedFlag).toBe(true);
      expect(no?.isRedFlag).toBe(false);
    });
  });

  describe('Q2_OPTIONS', () => {
    it('marks Investment/Helping/Government/Job as red flags', () => {
      expect(Q2_OPTIONS.find((o) => o.key === 'q2_investment')?.isRedFlag).toBe(
        true,
      );
      expect(Q2_OPTIONS.find((o) => o.key === 'q2_helping')?.isRedFlag).toBe(
        true,
      );
      expect(Q2_OPTIONS.find((o) => o.key === 'q2_government')?.isRedFlag).toBe(
        true,
      );
      expect(Q2_OPTIONS.find((o) => o.key === 'q2_job')?.isRedFlag).toBe(true);
    });

    it('marks Goods/Self-Transfer as non-red-flag baseline options', () => {
      expect(Q2_OPTIONS.find((o) => o.key === 'q2_goods')?.isRedFlag).toBe(
        false,
      );
      expect(
        Q2_OPTIONS.find((o) => o.key === 'q2_self_transfer')?.isRedFlag,
      ).toBe(false);
    });
  });

  describe('Q3_OPTIONS', () => {
    it('marks the "yes" answer as a red flag and the "no" answer as not', () => {
      expect(Q3_OPTIONS.find((o) => o.key === 'q3_yes')?.isRedFlag).toBe(true);
      expect(Q3_OPTIONS.find((o) => o.key === 'q3_no')?.isRedFlag).toBe(false);
    });
  });

  describe('getRedFlagCount', () => {
    it('returns 0 for empty answers', () => {
      expect(getRedFlagCount({})).toBe(0);
    });

    it('returns 0 when every answer is clean', () => {
      const answers: Answers = {
        q1: Q1_OPTIONS.find((o) => o.key === 'q1_no'),
        q2: Q2_OPTIONS.find((o) => o.key === 'q2_goods'),
        q3: Q3_OPTIONS.find((o) => o.key === 'q3_no'),
      };
      expect(getRedFlagCount(answers)).toBe(0);
    });

    it('counts each red-flag answer once', () => {
      const answers: Answers = {
        q1: Q1_OPTIONS.find((o) => o.key === 'q1_yes'),
        q2: Q2_OPTIONS.find((o) => o.key === 'q2_investment'),
        q3: Q3_OPTIONS.find((o) => o.key === 'q3_yes'),
      };
      expect(getRedFlagCount(answers)).toBe(3);
    });

    it('counts a single red flag mixed with clean answers', () => {
      const answers: Answers = {
        q1: Q1_OPTIONS.find((o) => o.key === 'q1_no'),
        q2: Q2_OPTIONS.find((o) => o.key === 'q2_government'),
        q3: Q3_OPTIONS.find((o) => o.key === 'q3_no'),
      };
      expect(getRedFlagCount(answers)).toBe(1);
    });
  });

  describe('getRedFlagQuestions', () => {
    it('returns only the question ids whose selected option is a red flag', () => {
      const answers: Answers = {
        q1: Q1_OPTIONS.find((o) => o.key === 'q1_no'),
        q2: Q2_OPTIONS.find((o) => o.key === 'q2_investment'),
        q3: Q3_OPTIONS.find((o) => o.key === 'q3_yes'),
      };
      expect(getRedFlagQuestions(answers).sort()).toEqual(['q2', 'q3']);
    });

    it('returns an empty array when no answers are red flags', () => {
      expect(getRedFlagQuestions({})).toEqual([]);
    });
  });
});
