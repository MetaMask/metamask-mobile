// PROTOTYPE-DO-NOT-MERGE
import {
  KalshiPrototypeRoutes,
  getKalshiPrototypeRouteForScript,
} from './prototypeRoutes';
import { enterScenario } from './prototypeScenarioEngine';

describe('getKalshiPrototypeRouteForScript', () => {
  it('opens on the UKYC check before a scenario is armed', () => {
    expect(getKalshiPrototypeRouteForScript(null)).toBe(
      KalshiPrototypeRoutes.UKYC_CHECK,
    );
  });

  it('opens a new user on the consent page', () => {
    expect(
      getKalshiPrototypeRouteForScript(enterScenario('newUserHasMfa')),
    ).toBe(KalshiPrototypeRoutes.CONSENT);
  });

  it('opens a returning UKYC user on the Kalshi terms page', () => {
    expect(
      getKalshiPrototypeRouteForScript(enterScenario('returningUkycUser')),
    ).toBe(KalshiPrototypeRoutes.VENDOR_TERMS);
  });

  it('picks the phone code once the code was sent', () => {
    const script = enterScenario('newUserHasMfa');
    const onPhone = {
      ...script,
      vendor: { ...script.vendor, step: 'kalshi_phone_link' as const },
    };

    expect(getKalshiPrototypeRouteForScript(onPhone)).toBe(
      KalshiPrototypeRoutes.PHONE_ENTRY,
    );
    expect(
      getKalshiPrototypeRouteForScript({ ...onPhone, phoneCodeSent: true }),
    ).toBe(KalshiPrototypeRoutes.PHONE_CODE);
  });

  it('has no screen for an email step without a session', () => {
    const script = enterScenario('newUserHasMfa');

    expect(
      getKalshiPrototypeRouteForScript({
        ...script,
        vendor: { ...script.vendor, step: 'kalshi_email_link' },
      }),
    ).toBeUndefined();
  });
});
