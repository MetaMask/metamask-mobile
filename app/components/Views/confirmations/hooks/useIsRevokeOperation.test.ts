import { SignatureRequest } from '@metamask/signature-controller';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useIsRevokeOperation } from './useIsRevokeOperation';
import { useApproveTransactionData } from './useApproveTransactionData';
import { useSignatureRequest } from './signatures/useSignatureRequest';

jest.mock('./useApproveTransactionData', () => ({
  useApproveTransactionData: jest.fn(),
}));

jest.mock('./signatures/useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

const createMockPermitSignatureRequest = (
  value: string,
  allowed?: boolean,
  verifyingContract = '0x6B175474E89094C44Da98b954EesddFD691dACB6E',
  tokenId?: string,
) =>
  ({
    messageParams: {
      data: JSON.stringify({
        domain: {
          verifyingContract,
        },
        message: {
          value,
          ...(allowed !== undefined && { allowed }),
          ...(tokenId !== undefined && { tokenId }),
        },
        primaryType: 'Permit',
      }),
    },
    type: 'eth_signTypedData_v4',
  }) as unknown as SignatureRequest;

describe('useIsRevokeOperation', () => {
  const mockUseApproveTransactionData = jest.mocked(useApproveTransactionData);
  const mockUseSignatureRequest = jest.mocked(useSignatureRequest);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApproveTransactionData.mockReturnValue({
      isRevoke: false,
      isLoading: false,
    });
    mockUseSignatureRequest.mockReturnValue(undefined);
  });

  describe('transaction revokes', () => {
    it('returns isRevoke true when transaction is a revoke', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: true,
        isLoading: false,
      });

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns isRevoke false when transaction is not a revoke', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: false,
        isLoading: false,
      });

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(false);
    });

    it('returns isLoading true when transaction data is loading', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: undefined,
        isLoading: true,
      });

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('permit signature revokes', () => {
    it('returns isRevoke true when permit value is 0', () => {
      mockUseSignatureRequest.mockReturnValue(
        createMockPermitSignatureRequest('0'),
      );

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(true);
    });

    it('returns isRevoke true for DAI permit with allowed false', () => {
      const daiAddress = '0x6B175474E89094C44Da98b954EesddFD691dACB6E';
      mockUseSignatureRequest.mockReturnValue(
        createMockPermitSignatureRequest('1000', false, daiAddress),
      );

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(true);
    });

    it('returns isRevoke false when permit value is non-zero', () => {
      mockUseSignatureRequest.mockReturnValue(
        createMockPermitSignatureRequest('1000000000000000000'),
      );

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(false);
    });

    it('returns isRevoke false for NFT permit with tokenId 0', () => {
      mockUseSignatureRequest.mockReturnValue(
        createMockPermitSignatureRequest(
          '0',
          undefined,
          '0x1234567890123456789012345678901234567890',
          '0',
        ),
      );

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(false);
    });

    it('returns isRevoke false when no signature request exists', () => {
      mockUseSignatureRequest.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(false);
    });
  });

  describe('combined transaction and signature', () => {
    it('returns isRevoke true when transaction is revoke even if signature is not', () => {
      mockUseApproveTransactionData.mockReturnValue({
        isRevoke: true,
        isLoading: false,
      });
      mockUseSignatureRequest.mockReturnValue(
        createMockPermitSignatureRequest('1000'),
      );

      const { result } = renderHookWithProvider(() => useIsRevokeOperation(), {
        state: {},
      });

      expect(result.current.isRevoke).toBe(true);
    });
  });
});
