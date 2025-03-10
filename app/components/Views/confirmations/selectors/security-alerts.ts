import { SecurityAlertResponse } from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';

export const selectSignatureSecurityAlertResponse = (
  rootState: RootState,
): { securityAlertResponse: SecurityAlertResponse } =>
  rootState.signatureRequest;
