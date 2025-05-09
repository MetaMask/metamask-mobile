import { SecurityAlertResponse } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { securityAlertResponse as mockSecurityAlertResponse } from '../../../../../util/test/confirm-data-helpers';
import { useSecurityAlertResponse } from './useSecurityAlertResponse';

function renderHook(securityAlertResponse?: SecurityAlertResponse) {
  const { result } = renderHookWithProvider(useSecurityAlertResponse, {
    state: {
      signatureRequest: { securityAlertResponse },
    },
  });

  return result.current;
}

describe('useSecurityAlertResponse', () => {
  it('returns security alert response for signature request is present', () => {
    const result = renderHook(
      mockSecurityAlertResponse as SecurityAlertResponse,
    );
    expect(result).toStrictEqual({
      securityAlertResponse: mockSecurityAlertResponse,
    });
  });

  it('returns undefined is security alert response is not present for signature request', () => {
    const result = renderHook();
    expect(result.securityAlertResponse).toBeUndefined();
  });
});
