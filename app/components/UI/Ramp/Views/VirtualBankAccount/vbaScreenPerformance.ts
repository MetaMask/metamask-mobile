import { VbaIdentityVerificationRoutes, VbaOnboardingRoutes } from './routes';
import { KYC_SCREEN_ID } from '../../../KYC/kycScreenPerformance';
import { TraceName, TraceOperation } from '../../../../../util/trace';
import { getVbaCufLifecycleContext } from './vbaCufLifecycle';
import { VBA_CUF_TAG } from './vbaCufTags';

export {
  SCREEN_CONTENT_STATE as VBA_SCREEN_CONTENT_STATE,
  type ScreenContentState as VbaScreenContentState,
} from '../../../../../hooks/useScreenPerformance';

export const VBA_SCREEN_ID = {
  ONBOARDING_LOADING: 'onboarding_loading',
  VENDOR_TERMS: 'vendor_terms',
  EMAIL_VERIFICATION: 'email_verification',
  KYC_PENDING: 'kyc_pending',
  IDENTITY_VERIFIED: 'identity_verified',
  CHOOSE_CURRENCY: 'choose_currency',
  KYC_REJECTED: 'kyc_rejected',
  ACCOUNT_PROVISIONING_ERROR: 'account_provisioning_error',
  ACCOUNT_CREATE_DETAILS_ERROR: 'account_create_details_error',
  ACCOUNT_CREATE_GENERIC_ERROR: 'account_create_generic_error',
  ONBOARDING_ERROR: 'onboarding_error',
  ACCOUNT_CREATION: 'account_creation',
  ACCOUNT_DETAILS: 'account_details',
} as const;

export type VbaScreenId = (typeof VBA_SCREEN_ID)[keyof typeof VBA_SCREEN_ID];

export const VBA_SCREEN_PERFORMANCE_CONFIG = {
  traceName: TraceName.VbaScreenLoad,
  traceOperation: TraceOperation.VbaOperation,
  feature: 'vba',
  flow: 'vba',
  logMarker: '[VbaCUF]',
  screenIds: Object.values(VBA_SCREEN_ID),
  getAdditionalTags: () => ({
    [VBA_CUF_TAG.LIFECYCLE_CONTEXT]: getVbaCufLifecycleContext(),
  }),
};

export const VBA_ONBOARDING_ROUTE_SCREEN_IDS = {
  [VbaOnboardingRoutes.VENDOR_TERMS]: [VBA_SCREEN_ID.VENDOR_TERMS],
  [VbaOnboardingRoutes.LOADING]: [VBA_SCREEN_ID.ONBOARDING_LOADING],
  [VbaOnboardingRoutes.EMAIL]: [VBA_SCREEN_ID.EMAIL_VERIFICATION],
  [VbaOnboardingRoutes.IDENTITY_VERIFICATION]: [
    KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
    KYC_SCREEN_ID.IDENTITY_VERIFICATION_PROVIDER,
  ],
  [VbaOnboardingRoutes.KYC_PENDING]: [VBA_SCREEN_ID.KYC_PENDING],
  [VbaOnboardingRoutes.IDENTITY_VERIFIED]: [VBA_SCREEN_ID.IDENTITY_VERIFIED],
  [VbaOnboardingRoutes.CHOOSE_CURRENCY]: [VBA_SCREEN_ID.CHOOSE_CURRENCY],
  [VbaOnboardingRoutes.KYC_REJECTED]: [VBA_SCREEN_ID.KYC_REJECTED],
  [VbaOnboardingRoutes.ACCOUNT_PROVISIONING_ERROR]: [
    VBA_SCREEN_ID.ACCOUNT_PROVISIONING_ERROR,
  ],
  [VbaOnboardingRoutes.ACCOUNT_CREATE_ERROR]: [
    VBA_SCREEN_ID.ACCOUNT_CREATE_DETAILS_ERROR,
    VBA_SCREEN_ID.ACCOUNT_CREATE_GENERIC_ERROR,
  ],
  [VbaOnboardingRoutes.ERROR]: [VBA_SCREEN_ID.ONBOARDING_ERROR],
} as const;

export const VBA_IDENTITY_ROUTE_SCREEN_IDS = {
  [VbaIdentityVerificationRoutes.PROVIDER_TERMS]:
    KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
  [VbaIdentityVerificationRoutes.PROVIDER]:
    KYC_SCREEN_ID.IDENTITY_VERIFICATION_PROVIDER,
} as const;

export const VBA_DETAILS_SCREEN_IDS = [
  VBA_SCREEN_ID.ACCOUNT_CREATION,
  VBA_SCREEN_ID.ACCOUNT_DETAILS,
] as const;

export const VBA_MODAL_SCREEN_IDS = [
  KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
] as const;

export const VBA_FLOW_SCREEN_IDS = [
  ...Object.values(VBA_SCREEN_ID),
  ...Object.values(KYC_SCREEN_ID),
] as const;
