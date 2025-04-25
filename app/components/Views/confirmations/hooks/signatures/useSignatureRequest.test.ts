import { ApprovalType } from '@metamask/controller-utils';
import {
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSignatureRequest } from './useSignatureRequest';

const ID_MOCK = '123-456-789';

const SIGNATURE_REQUEST_MOCK: Partial<SignatureRequest> = {
  id: ID_MOCK,
  messageParams: {
    data: '0xdata',
    from: '0xfrom',
    origin: 'https://origin.com',
  },
  type: SignatureRequestType.PersonalSign,
};

function renderHook({
  approvalType,
  signatureRequest,
}: {
  approvalType?: ApprovalType;
  signatureRequest: Partial<SignatureRequest>;
}) {
  const { result } = renderHookWithProvider(useSignatureRequest, {
    state: {
      engine: {
        backgroundState: {
          ApprovalController: {
            pendingApprovals: {
              [ID_MOCK]: {
                id: ID_MOCK,
                type: approvalType ?? ApprovalType.PersonalSign,
              },
            },
          },
          SignatureController: {
            signatureRequests: {
              [signatureRequest.id as string]: signatureRequest,
            },
          },
        },
      },
    },
  });

  return result.current;
}

describe('useSignatureRequest', () => {
  it('returns signature request matching approval request ID', () => {
    const result = renderHook({ signatureRequest: SIGNATURE_REQUEST_MOCK });
    expect(result).toStrictEqual(SIGNATURE_REQUEST_MOCK);
  });

  it('returns undefined if matching signature request not found', () => {
    const result = renderHook({
      signatureRequest: { ...SIGNATURE_REQUEST_MOCK, id: 'invalid-id' },
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined if wrong approval type', () => {
    const result = renderHook({
      signatureRequest: SIGNATURE_REQUEST_MOCK,
      approvalType: ApprovalType.Transaction,
    });
    expect(result).toBeUndefined();
  });
});
