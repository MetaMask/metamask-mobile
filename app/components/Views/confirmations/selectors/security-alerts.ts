import { RootState } from '../../../../reducers';
import { SecurityAlertResponse } from '../legacy/components/BlockaidBanner/BlockaidBanner.types';

export const selectSignatureSecurityAlertResponse = (
  rootState: RootState,
): { securityAlertResponse?: SecurityAlertResponse } =>
  rootState.signatureRequest;
