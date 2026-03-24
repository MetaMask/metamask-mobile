import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  securityAlertResponse as mockSecurityAlertResponse,
  transferConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { useSecurityAlertResponse } from './useSecurityAlertResponse';

// Transaction ID used in transferConfirmationState
const TRANSFER_CONFIRMATION_TRANSACTION_ID =
  '699ca2f0-e459-11ef-b6f6-d182277cf5e1';

describe('useSecurityAlertResponse', () => {
  it('returns security alert response for transaction request is present', () => {
    const { result } = renderHookWithProvider(useSecurityAlertResponse, {
      state: merge({}, transferConfirmationState, {
        securityAlerts: {
          alerts: {
            [TRANSFER_CONFIRMATION_TRANSACTION_ID]: mockSecurityAlertResponse,
          },
        },
      }),
    });
    expect(result.current).toStrictEqual({
      securityAlertResponse: mockSecurityAlertResponse,
    });
  });

  it('returns security alert response from transaction metadata when present', () => {
    // When securityAlertResponse is in TransactionController state, it takes precedence
    const transactionWithAlert = {
      ...transferConfirmationState.engine.backgroundState.TransactionController
        .transactions[0],
      securityAlertResponse: mockSecurityAlertResponse,
    };
    const { result } = renderHookWithProvider(useSecurityAlertResponse, {
      state: merge({}, transferConfirmationState, {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [transactionWithAlert],
            },
          },
        },
      }),
    });
    expect(result.current).toStrictEqual({
      securityAlertResponse: mockSecurityAlertResponse,
    });
  });

  it('returns undefined when security alert response is not present', () => {
    const { result } = renderHookWithProvider(useSecurityAlertResponse, {
      state: transferConfirmationState,
    });
    expect(result.current).toStrictEqual({
      securityAlertResponse: undefined,
    });
  });
});
