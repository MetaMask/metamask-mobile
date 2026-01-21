import { RootState } from '../../../../reducers';
import { SecurityAlertResponse } from '../components/blockaid-banner/BlockaidBanner.types';

export const selectSignatureSecurityAlertResponse = (
  rootState: RootState,
): { securityAlertResponse?: SecurityAlertResponse } =>
  rootState.signatureRequest;
