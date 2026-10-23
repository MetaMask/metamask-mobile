import {
  SCREEN_CONTENT_STATE,
  type ScreenContentState,
} from '../../../hooks/useScreenPerformance';
import { TraceName, TraceOperation } from '../../../util/trace';

export const KYC_SCREEN_CONTENT_STATE = SCREEN_CONTENT_STATE;
export type KycScreenContentState = ScreenContentState;

export const KYC_SCREEN_ID = {
  IDENTITY_VERIFICATION_TERMS: 'identity_verification_terms',
  IDENTITY_VERIFICATION_PROVIDER: 'identity_verification_provider',
  PROVIDER_TERMS_MODAL: 'provider_terms_modal',
} as const;

export const KYC_SCREEN_PERFORMANCE_CONFIG = {
  traceName: TraceName.KycScreenLoad,
  traceOperation: TraceOperation.KycOperation,
  feature: 'kyc',
  flow: 'vba',
  logMarker: '[KycCUF]',
  screenIds: Object.values(KYC_SCREEN_ID),
};
