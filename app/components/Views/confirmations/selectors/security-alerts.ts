import { RootState } from '../../../../reducers';
import { selectSecurityAlertResponse } from '../../../../reducers/security-alerts';

export const selectSecurityAlertResponseByConfirmationId = (
  state: RootState,
  id: string,
) => selectSecurityAlertResponse(state, id);
