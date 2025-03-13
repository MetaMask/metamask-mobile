import { isValidSIWEOrigin } from '@metamask/controller-utils';
import { RowAlertKey } from '../../../components/UI/InfoRow/AlertRow/constants';
import useApprovalRequest from '../../useApprovalRequest';
import { Severity } from '../../../types/alerts';
import { useSignatureRequest } from '../../useSignatureRequest';
import { isSIWESignatureRequest } from '../../../utils/signature';
import useDomainMismatchAlerts from './useDomainMismatchAlerts';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { siweSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';

jest.mock('../../useApprovalRequest');
jest.mock('../../useSignatureRequest');
jest.mock('@metamask/controller-utils');
jest.mock('../../../utils/signature');

describe('useDomainMismatchAlerts', () => {
  const mockApprovalRequest = {
    requestData: {
      origin: 'example.com',
      meta: {
        url: 'https://example.com',
      },
    },
  };

  const mockSignatureRequest = {
    origin: 'example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useApprovalRequest as jest.Mock).mockReturnValue({ approvalRequest: mockApprovalRequest });
    (useSignatureRequest as jest.Mock).mockReturnValue(mockSignatureRequest);
  });

  it('returns an empty array when there is no domain mismatch', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([]);
  });

  it('returns an empty array when the SIWE origin is valid', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    (isValidSIWEOrigin as jest.Mock).mockReturnValue(true);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([]);
  });

  it('returns an alert when there is a domain mismatch', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    (isValidSIWEOrigin as jest.Mock).mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual({
      field: RowAlertKey.RequestFrom,
      key: RowAlertKey.RequestFrom,
      message: `The site making the request is not the site you’re signing into. This could be an attempt to steal your login credentials.`,
      title: 'Suspicious sign-in request',
      severity: Severity.Danger,
    });
  });

  it('uses meta.url when requestData.origin does not have a protocol', () => {
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    (isValidSIWEOrigin as jest.Mock).mockImplementation((request) => request.origin === 'https://example.com');

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([]);
  });

  it('uses requestData.origin when it has a protocol', () => {
    const mockApprovalRequestWithProtocol = {
      requestData: {
        origin: 'https://example.com',
        meta: {
          url: 'https://example.com',
        },
      },
    };

    (useApprovalRequest as jest.Mock).mockReturnValue({ approvalRequest: mockApprovalRequestWithProtocol });
    (isSIWESignatureRequest as jest.Mock).mockReturnValue(true);
    (isValidSIWEOrigin as jest.Mock).mockImplementation((request) => request.origin === 'https://example.com');

    const { result } = renderHookWithProvider(() => useDomainMismatchAlerts(), {
      state: siweSignatureConfirmationState,
    });

    expect(result.current).toEqual([]);
  });
});
