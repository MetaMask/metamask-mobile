// PROTOTYPE-DO-NOT-MERGE
import {
  activateKalshiPrototype,
  activateKalshiPrototypeScenario,
  deriveKalshiPrototypeCardState,
  dismissKalshiPrototypeCard,
  getKalshiPrototypeKycService,
  getKalshiPrototypeRuntime,
  getKalshiPrototypeVendorOnboarding,
  isKalshiPrototypeActive,
  prototypeCompleteSumsub,
  resetKalshiPrototype,
  resolveKalshiPrototypeDecision,
} from './prototypeRuntime';
import { PROTOTYPE_CODE } from './prototypeConstants';

// The runtime reaches the Engine only through the injection's boundary swap;
// the test mocks it so the unit stays light.
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KycController: {
        state: {},
        fetchSessionDisclaimers: jest.fn(),
      },
    },
  },
}));

const devGlobal = globalThis as { __DEV__?: boolean };
const originalDev = devGlobal.__DEV__;

describe('prototypeRuntime', () => {
  beforeEach(() => {
    devGlobal.__DEV__ = true;
    resetKalshiPrototype();
  });

  afterAll(() => {
    devGlobal.__DEV__ = originalDev;
    resetKalshiPrototype();
  });

  it('is inactive until activated, and reset turns it off', () => {
    expect(isKalshiPrototypeActive()).toBe(false);

    activateKalshiPrototype();
    expect(isKalshiPrototypeActive()).toBe(true);
    expect(getKalshiPrototypeRuntime().script).toBeNull();

    resetKalshiPrototype();
    expect(isKalshiPrototypeActive()).toBe(false);
    expect(getKalshiPrototypeRuntime().script).toBeNull();
  });

  it('is inert outside __DEV__', () => {
    devGlobal.__DEV__ = false;

    activateKalshiPrototype();
    expect(isKalshiPrototypeActive()).toBe(false);

    activateKalshiPrototypeScenario('newUserHasMfa');
    expect(isKalshiPrototypeActive()).toBe(false);

    devGlobal.__DEV__ = true;
  });

  it('arms a scenario and walks the new-user path through the fakes', async () => {
    activateKalshiPrototypeScenario('newUserHasMfa');
    const vendor = getKalshiPrototypeVendorOnboarding();

    await expect(vendor.refreshStep({ vendor: 'kalshi' })).resolves.toBe(
      'terms',
    );
    await expect(vendor.recordMfaCompleted({ vendor: 'kalshi' })).resolves.toBe(
      'terms',
    );
    await expect(vendor.submitTerms({ vendor: 'kalshi' })).resolves.toBe(
      'kalshi_email_link',
    );
    await expect(vendor.startSession({ vendor: 'kalshi' })).resolves.toBe(
      'kalshi_email_link',
    );
    await expect(
      vendor.verifyEmailOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE }),
    ).resolves.toBe('kalshi_phone_link');
    await expect(
      vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE }),
    ).resolves.toBe('sumsub');
    expect(getKalshiPrototypeRuntime().script?.vendor.step).toBe('sumsub');
  });

  it('refuses a wrong code with kyc-api’s error', async () => {
    activateKalshiPrototypeScenario('newUserHasMfa');
    const vendor = getKalshiPrototypeVendorOnboarding();
    await vendor.submitTerms({ vendor: 'kalshi' });
    await vendor.startSession({ vendor: 'kalshi' });

    await expect(
      vendor.verifyEmailOtp({ vendor: 'kalshi', code: '111111' }),
    ).rejects.toMatchObject({ code: 'invalid_or_expired_code' });
    // The refused check leaves the step where it was.
    expect(getKalshiPrototypeRuntime().script?.vendor.step).toBe(
      'kalshi_email_link',
    );
  });

  it('sends the returning user straight to the decision', async () => {
    activateKalshiPrototypeScenario('returningUkycUser');
    const vendor = getKalshiPrototypeVendorOnboarding();

    await vendor.submitTerms({ vendor: 'kalshi' });
    await vendor.verifyEmailOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });
    await vendor.sendPhoneOtp({
      vendor: 'kalshi',
      phoneNumber: '+15555550123',
    });
    await vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });

    expect(getKalshiPrototypeRuntime().script?.vendor.step).toBe('decision');
  });

  it('holds the Sumsub launch open until its presentation is left', async () => {
    activateKalshiPrototypeScenario('newUserHasMfa');
    const vendor = getKalshiPrototypeVendorOnboarding();
    await vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });

    const launch = vendor.launchProviderFlow({ vendor: 'kalshi' });
    expect(getKalshiPrototypeRuntime().sumsubOpen).toBe(true);

    prototypeCompleteSumsub('submitted');
    await expect(launch).resolves.toBe('submitted');
    expect(getKalshiPrototypeRuntime().script?.vendor.step).toBe('decision');
  });

  it('answers the terms screens from the fake service', async () => {
    activateKalshiPrototypeScenario('returningUkycUser');
    const service = getKalshiPrototypeKycService();

    await expect(service.getGeoCountry()).resolves.toBe('USA');
    const catalog = await service.fetchSessionDisclaimersByCountry({
      country: 'USA',
    });
    expect(catalog.idOS).toHaveLength(0);
    expect(
      await service.fetchVendorDisclaimers({
        vendor: 'kalshi',
        country: 'USA',
      }),
    ).toHaveLength(5);
  });

  it('throws when the fakes are called with the toggle off', async () => {
    const vendor = getKalshiPrototypeVendorOnboarding();
    await expect(vendor.refreshStep({ vendor: 'kalshi' })).rejects.toThrow(
      'Kalshi prototype is not active.',
    );
  });

  describe('card state', () => {
    /** Walks the new-user path as far as the identity provider. */
    const walkToSumsub = async () => {
      activateKalshiPrototypeScenario('newUserHasMfa');
      const vendor = getKalshiPrototypeVendorOnboarding();
      await vendor.submitTerms({ vendor: 'kalshi' });
      await vendor.startSession({ vendor: 'kalshi' });
      await vendor.verifyEmailOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });
      await vendor.sendPhoneOtp({ vendor: 'kalshi' });
      return vendor;
    };

    it('is getStarted while no scenario is armed', () => {
      activateKalshiPrototype();
      expect(deriveKalshiPrototypeCardState(null)).toBe('getStarted');
      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('getStarted');
    });

    it('is needMoreInfo from the first step until KYC is submitted', async () => {
      const vendor = await walkToSumsub();

      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('needMoreInfo');
      await vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });
      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('needMoreInfo');
    });

    it('is verifying while the review is pending, and terminal states after it', async () => {
      const vendor = await walkToSumsub();
      await vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });
      const launch = vendor.launchProviderFlow({ vendor: 'kalshi' });
      prototypeCompleteSumsub('submitted');
      await expect(launch).resolves.toBe('submitted');

      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('verifying');

      resolveKalshiPrototypeDecision('approved');
      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('verified');

      // A terminal review is not pending, so the control cannot move it.
      resolveKalshiPrototypeDecision('rejected');
      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('verified');
    });

    it('settles a pending review on a rejection', async () => {
      const vendor = await walkToSumsub();
      await vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });
      const launch = vendor.launchProviderFlow({ vendor: 'kalshi' });
      prototypeCompleteSumsub('submitted');
      await expect(launch).resolves.toBe('submitted');

      resolveKalshiPrototypeDecision('rejected');
      expect(
        deriveKalshiPrototypeCardState(getKalshiPrototypeRuntime().script),
      ).toBe('cantVerify');
    });

    it('keeps a dismissed terminal card hidden until the scenario resets', async () => {
      const vendor = await walkToSumsub();
      await vendor.verifyPhoneOtp({ vendor: 'kalshi', code: PROTOTYPE_CODE });
      const launch = vendor.launchProviderFlow({ vendor: 'kalshi' });
      prototypeCompleteSumsub('submitted');
      await expect(launch).resolves.toBe('submitted');
      resolveKalshiPrototypeDecision('approved');

      dismissKalshiPrototypeCard();
      expect(getKalshiPrototypeRuntime().cardDismissed).toBe(true);

      activateKalshiPrototypeScenario('newUserHasMfa');
      expect(getKalshiPrototypeRuntime().cardDismissed).toBe(false);
    });

    it('does not resolve when no review is pending', () => {
      activateKalshiPrototypeScenario('newUserHasMfa');
      resolveKalshiPrototypeDecision('approved');
      expect(getKalshiPrototypeRuntime().script?.vendor.status).toBe('none');
    });
  });
});
