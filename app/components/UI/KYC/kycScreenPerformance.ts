import { TraceName, TraceOperation } from '../../../util/trace';
import { getVbaCufLifecycleContext } from '../Ramp/Views/VirtualBankAccount/vbaCufLifecycle';
import { VBA_CUF_TAG } from '../Ramp/Views/VirtualBankAccount/vbaCufTags';

export {
  SCREEN_CONTENT_STATE as KYC_SCREEN_CONTENT_STATE,
  type ScreenContentState as KycScreenContentState,
} from '../../../hooks/useScreenPerformance';

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
  getAdditionalTags: () => ({
    [VBA_CUF_TAG.LIFECYCLE_CONTEXT]: getVbaCufLifecycleContext(),
  }),
};
