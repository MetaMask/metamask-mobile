// PROTOTYPE-DO-NOT-MERGE
import {
  enterScenario,
  acceptTerms,
  checkEmailCode,
  checkPhoneCode,
  finishSumsub,
  openSession,
  prototypeCodeError,
  prototypePartnerEmail,
  prototypeSessionCatalog,
  prototypeVendorDisclaimers,
  readStep,
  recordMfa,
  resendEmailCode,
  sendPhone,
} from './prototypeScenarioEngine';
import { PROTOTYPE_CODE, PROTOTYPE_EMAIL } from './prototypeConstants';

const linkedState = (scenario: Parameters<typeof enterScenario>[0]) =>
  openSession(acceptTerms(enterScenario(scenario)));

describe('prototypeScenarioEngine', () => {
  describe('newUserHasMfa', () => {
    it('starts on the terms with MFA already done and no session', () => {
      const state = enterScenario('newUserHasMfa');

      expect(state.vendor.step).toBe('terms');
      expect(state.vendor.mfaCompleted).toBe(true);
      expect(state.hasValidMfaSession).toBe(true);
      expect(state.vendor.sessionId).toBeNull();
    });

    it('walks the happy path to an approved decision', () => {
      let state = linkedState('newUserHasMfa');

      expect(state.vendor.step).toBe('kalshi_email_link');
      expect(state.vendor.sessionId).not.toBeNull();

      state = checkEmailCode(state, PROTOTYPE_CODE);
      expect(state.vendor.step).toBe('kalshi_phone_link');

      state = sendPhone(state);
      expect(state.phoneCodeSent).toBe(true);

      state = checkPhoneCode(state, PROTOTYPE_CODE);
      expect(state.vendor.step).toBe('sumsub');

      state = finishSumsub(state);
      expect(state.vendor.step).toBe('decision');
      expect(state.vendor.status).toBe('pending');

      // The first read of the pending decision still waits.
      state = readStep(state);
      expect(state.vendor.status).toBe('pending');

      // The next read settles it on the scenario's outcome.
      state = readStep(state);
      expect(state.vendor.status).toBe('approved');
    });

    it('refuses every code that is not the prototype code', () => {
      expect(() =>
        checkEmailCode(linkedState('newUserHasMfa'), '000000'),
      ).toThrow(prototypeCodeError());
      expect(() =>
        checkPhoneCode(linkedState('newUserHasMfa'), '654321'),
      ).toThrow(prototypeCodeError());
    });

    it('offers the full idOS and SumSub catalog for the consent pages', () => {
      const state = enterScenario('newUserHasMfa');
      const catalog = prototypeSessionCatalog(state);

      expect(catalog.idOS).toHaveLength(1);
      expect(catalog.kycProvider).toHaveLength(1);
      expect(prototypeVendorDisclaimers()).toHaveLength(5);
      expect(prototypePartnerEmail).toBe(PROTOTYPE_EMAIL);
    });
  });

  describe('returningUkycUser', () => {
    it('starts on the terms with a session and no MFA ask', () => {
      const state = enterScenario('returningUkycUser');

      expect(state.vendor.step).toBe('terms');
      expect(state.vendor.mfaCompleted).toBe(true);
      expect(state.hasValidMfaSession).toBe(true);
      expect(state.vendor.sessionId).not.toBeNull();
    });

    it('offers an empty idOS and SumSub catalog, so only the catch-up consent shows', () => {
      const catalog = prototypeSessionCatalog(
        enterScenario('returningUkycUser'),
      );

      expect(catalog.idOS).toHaveLength(0);
      expect(catalog.kycProvider).toHaveLength(0);
    });

    it('skips Sumsub on the way to the decision', () => {
      let state = linkedState('returningUkycUser');

      expect(state.vendor.step).toBe('kalshi_email_link');
      expect(state.vendor.sessionId).not.toBeNull();

      state = checkEmailCode(state, PROTOTYPE_CODE);
      expect(state.vendor.step).toBe('kalshi_phone_link');

      state = checkPhoneCode(sendPhone(state), PROTOTYPE_CODE);
      expect(state.vendor.step).toBe('decision');
      expect(state.vendor.status).toBe('pending');
    });

    it('settles the decision on approval', () => {
      let state = enterScenario('returningUkycUser');
      state = finishSumsub(state);

      state = readStep(state);
      expect(state.vendor.status).toBe('pending');
      state = readStep(state);
      expect(state.vendor.status).toBe('approved');
    });
  });

  describe('recordMfaCompleted', () => {
    it('records MFA and moves to the terms', () => {
      const next = recordMfa(enterScenario('newUserHasMfa'));

      expect(next.vendor.mfaCompleted).toBe(true);
      expect(next.vendor.step).toBe('terms');
    });
  });

  describe('resendEmailCode', () => {
    it('marks a new code as sent without moving the step', () => {
      const next = resendEmailCode(linkedState('newUserHasMfa'));

      expect(next.emailCodeResent).toBe(true);
      expect(next.vendor.step).toBe('kalshi_email_link');
    });
  });

  describe('the refused answer', () => {
    it('carries kyc-api’s code for the screens to word', () => {
      expect(prototypeCodeError().code).toBe('invalid_or_expired_code');
    });
  });
});
