import { securityAlertResponse } from '../../../../util/test/confirm-data-helpers';
import initialRootState from '../../../../util/test/initial-root-state';
import { selectSecurityAlertResponseByConfirmationId } from './security-alerts';

const MOCK_ID = 'test-id-123';

describe('Security Alert Selectors', () => {
  describe('selectSecurityAlertResponseByConfirmationId', () => {
    it('returns security alert response for given ID', () => {
      const state = {
        ...initialRootState,
        securityAlerts: {
          alerts: {
            [MOCK_ID]: securityAlertResponse,
          },
        },
      };

      expect(
        selectSecurityAlertResponseByConfirmationId(state, MOCK_ID),
      ).toEqual(securityAlertResponse);
    });

    it('returns undefined if alert response not present for ID', () => {
      expect(
        selectSecurityAlertResponseByConfirmationId(
          initialRootState,
          'non-existent-id',
        ),
      ).toBeUndefined();
    });
  });
});
