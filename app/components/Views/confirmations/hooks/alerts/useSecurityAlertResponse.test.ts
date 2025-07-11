import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  securityAlertResponse as mockSecurityAlertResponse,
  transferConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { useSecurityAlertResponse } from './useSecurityAlertResponse';

describe('useSecurityAlertResponse', () => {
  it('returns security alert response for signature request is present', () => {
    const { result } = renderHookWithProvider(useSecurityAlertResponse, {
      state: merge({}, transferConfirmationState, {
        signatureRequest: {
          securityAlertResponse: mockSecurityAlertResponse,
        },
      }),
    });
    expect(result.current).toStrictEqual({
      securityAlertResponse: mockSecurityAlertResponse,
    });
  });

  it('returns security alert response for transaction request is present', () => {
    const { result } = renderHookWithProvider(useSecurityAlertResponse, {
      state: merge({}, transferConfirmationState, {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                { securityAlertResponse: mockSecurityAlertResponse },
              ],
            },
          },
        },
      }),
    });
    expect(result.current).toStrictEqual({
      securityAlertResponse: mockSecurityAlertResponse,
    });
  });

  it('returns undefined is security alert response is not present for signature request', () => {
    const { result } = renderHookWithProvider(useSecurityAlertResponse, {
      state: transferConfirmationState,
    });
    expect(result.current).toStrictEqual({
      securityAlertResponse: undefined,
    });
  });
});
