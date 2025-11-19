import { securityAlertResponse } from '../../../../util/test/confirm-data-helpers';
import initialRootState from '../../../../util/test/initial-root-state';
import { selectSignatureSecurityAlertResponse } from './security-alerts';

describe('Security Alert Selectors', () => {
  describe('selectSignatureSecurityAlertResponse', () => {
    it('returns signature security alert response from the state', () => {
      expect(
        selectSignatureSecurityAlertResponse({
          ...initialRootState,
          signatureRequest: {
            securityAlertResponse,
          },
        }),
      ).toEqual({ securityAlertResponse });
    });

    it('returns undefined if security alert response not present', () => {
      expect(selectSignatureSecurityAlertResponse(initialRootState)).toEqual({
        securityAlertResponse: undefined,
      });
    });
  });
});
