import reducer, {
  DappSpamFilterState,
  initialState,
  onRPCRequestRejectedByUser,
  resetDappSpamState,
  resetSpamPrompt,
  REJECTION_THRESHOLD_IN_MS,
} from './index';

const SCAM_DOMAIN_MOCK = 'scam.domain';

describe('dappSpamFilter slice', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeAll(() => {
    dateNowSpy = jest.spyOn(Date, 'now');
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  describe('onRPCRequestRejectedByUser', () => {
    it('handles first rejection for a domain', () => {
      dateNowSpy.mockReturnValue(1000);
      const action = onRPCRequestRejectedByUser(SCAM_DOMAIN_MOCK);
      const state = reducer(initialState, action);

      expect(state.domains[SCAM_DOMAIN_MOCK]).toEqual({
        rejections: 1,
        lastRejection: 1000,
      });
      expect(state.spamPrompt).toBe(false);
    });

    it('increase rejection count within threshold time', () => {
      const initialStateWithDomain: DappSpamFilterState = {
        ...initialState,
        domains: {
          [SCAM_DOMAIN_MOCK]: {
            rejections: 1,
            lastRejection: 10000,
          },
        },
      };

      dateNowSpy.mockReturnValue(15000);
      const action = onRPCRequestRejectedByUser(SCAM_DOMAIN_MOCK);
      const state = reducer(initialStateWithDomain, action);

      expect(state.domains[SCAM_DOMAIN_MOCK]).toEqual({
        rejections: 2,
        lastRejection: 15000,
      });
      expect(state.spamPrompt).toBe(false);
    });

    it('reset rejection count if outside threshold time', () => {
      const initialStateWithDomain: DappSpamFilterState = {
        ...initialState,
        domains: {
          [SCAM_DOMAIN_MOCK]: {
            rejections: 2,
            lastRejection: 1000,
          },
        },
      };

      const nextRejectionTimestamp = REJECTION_THRESHOLD_IN_MS + 1000;

      dateNowSpy.mockReturnValue(nextRejectionTimestamp);
      const action = onRPCRequestRejectedByUser(SCAM_DOMAIN_MOCK);
      const state = reducer(initialStateWithDomain, action);

      expect(state.domains[SCAM_DOMAIN_MOCK]).toEqual({
        rejections: 1,
        lastRejection: nextRejectionTimestamp,
      });
      expect(state.spamPrompt).toBe(false);
    });

    it('activate spam prompt if rejections exceed threshold', () => {
      const initialStateWithDomain: DappSpamFilterState = {
        ...initialState,
        domains: {
          [SCAM_DOMAIN_MOCK]: {
            rejections: 2,
            lastRejection: 1000,
          },
        },
      };

      dateNowSpy.mockReturnValue(20000);
      const action = onRPCRequestRejectedByUser(SCAM_DOMAIN_MOCK);
      const state = reducer(initialStateWithDomain, action);

      expect(state.domains[SCAM_DOMAIN_MOCK]).toEqual({
        rejections: 3,
        lastRejection: 20000,
      });
      expect(state.spamPrompt).toBe(true);
    });
  });

  describe('resetDappSpamState', () => {
    it('reset the state for a specific domain', () => {
      const initialStateWithDomain: DappSpamFilterState = {
        ...initialState,
        domains: {
          [SCAM_DOMAIN_MOCK]: {
            rejections: 3,
            lastRejection: 1000,
          },
        },
        spamPrompt: true,
      };

      const action = resetDappSpamState(SCAM_DOMAIN_MOCK);
      const state = reducer(initialStateWithDomain, action);

      expect(state.domains[SCAM_DOMAIN_MOCK]).toBeUndefined();
      expect(state.spamPrompt).toBe(false);
    });
  });

  describe('resetSpamPrompt', () => {
    it('reset the spam prompt', () => {
      const initialStateWithSpamPrompt: DappSpamFilterState = {
        ...initialState,
        spamPrompt: true,
      };

      const action = resetSpamPrompt();
      const state = reducer(initialStateWithSpamPrompt, action);

      expect(state.spamPrompt).toBe(false);
    });
  });
});
