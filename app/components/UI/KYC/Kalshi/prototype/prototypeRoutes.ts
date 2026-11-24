// PROTOTYPE-DO-NOT-MERGE
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import {
  prototypeSessionCatalog,
  type PrototypeScriptState,
} from './prototypeScenarioEngine';

/**
 * The screens of the prototype's nested onboarding stack, one per step,
 * mirroring how VBA's identity verification pushes its terms pages.
 */
export const KalshiPrototypeRoutes = {
  UKYC_CHECK: 'KalshiPrototypeUkycCheck',
  CONSENT: 'KalshiPrototypeConsent',
  PARTNER_TERMS: 'KalshiPrototypePartnerTerms',
  VENDOR_TERMS: 'KalshiPrototypeVendorTerms',
  EMAIL_CODE: 'KalshiPrototypeEmailCode',
  PHONE_ENTRY: 'KalshiPrototypePhoneEntry',
  PHONE_CODE: 'KalshiPrototypePhoneCode',
  SUMSUB: 'KalshiPrototypeSumsub',
  DECISION: 'KalshiPrototypeDecision',
} as const;

// React Navigation param lists must remain type aliases for strict route keys.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type KalshiPrototypeParamList = {
  KalshiPrototypeUkycCheck: undefined;
  KalshiPrototypeConsent: undefined;
  // The consent page fetches the catalog, so the partners page has no loader.
  KalshiPrototypePartnerTerms: { disclaimers: KycCatalogDisclaimerLink[] };
  KalshiPrototypeVendorTerms: undefined;
  KalshiPrototypeEmailCode: undefined;
  KalshiPrototypePhoneEntry: undefined;
  KalshiPrototypePhoneCode: undefined;
  KalshiPrototypeSumsub: undefined;
  KalshiPrototypeDecision: undefined;
};

/** The screens a step can open without params. */
export type KalshiPrototypeStepRoute = Exclude<
  (typeof KalshiPrototypeRoutes)[keyof typeof KalshiPrototypeRoutes],
  typeof KalshiPrototypeRoutes.PARTNER_TERMS
>;

/**
 * The screen the fake script says the flow is on: the UKYC check before a
 * scenario is armed, the consent page while the idOS and SumSub terms are
 * still owed (the vendor page alone for a returning user), then one screen
 * per kyc-api step.
 *
 * @param script - The fake script, or `null` before a scenario is armed.
 * @returns The screen, or `undefined` when the prototype has no view for it.
 */
export const getKalshiPrototypeRouteForScript = (
  script: PrototypeScriptState | null,
): KalshiPrototypeStepRoute | undefined => {
  if (!script) {
    return KalshiPrototypeRoutes.UKYC_CHECK;
  }
  switch (script.vendor.step) {
    case 'terms': {
      const catalog = prototypeSessionCatalog(script);
      return catalog.idOS.length > 0 || catalog.kycProvider.length > 0
        ? KalshiPrototypeRoutes.CONSENT
        : KalshiPrototypeRoutes.VENDOR_TERMS;
    }
    case 'kalshi_email_link':
      // Leg 1 has no email entry: the terms accept opens the session with
      // the verified email, so a link step without a session cannot occur.
      return script.vendor.sessionId
        ? KalshiPrototypeRoutes.EMAIL_CODE
        : undefined;
    case 'kalshi_phone_link':
      return script.phoneCodeSent
        ? KalshiPrototypeRoutes.PHONE_CODE
        : KalshiPrototypeRoutes.PHONE_ENTRY;
    case 'sumsub':
      return KalshiPrototypeRoutes.SUMSUB;
    case 'decision':
      return KalshiPrototypeRoutes.DECISION;
    default:
      return undefined;
  }
};
