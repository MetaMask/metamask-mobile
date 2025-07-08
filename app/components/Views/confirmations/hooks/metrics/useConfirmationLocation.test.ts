import { renderHook } from '@testing-library/react-hooks';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { CONFIRMATION_EVENT_LOCATIONS } from '../../../../../core/Analytics/events/confirmations';

import { useConfirmationLocation } from './useConfirmationLocation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';

// Mock the dependent hooks
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useApprovalRequest');

describe('useConfirmationLocation', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockUseApprovalRequest = jest.mocked(useApprovalRequest);

  function createApprovalRequestMock(approvalRequest: {
    type: TransactionType | ApprovalType;
    requestData: {
      version?: string;
    };
  }): ReturnType<typeof useApprovalRequest> {
    return {
      approvalRequest,
    } as unknown as ReturnType<typeof useApprovalRequest>;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseApprovalRequest.mockReturnValue({
      approvalRequest: undefined,
    } as unknown as ReturnType<typeof useApprovalRequest>);
  });

  it('returns undefined when no approval request or transaction meta is provided', () => {
    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBeUndefined();
  });

  it('returns PERSONAL_SIGN location for personal sign requests', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: TransactionType.personalSign,
        requestData: {},
      }),
    );

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.PERSONAL_SIGN);
  });

  it('returns TYPED_SIGN_V1 location for signTypedData with V1 version', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: TransactionType.signTypedData,
        requestData: { version: 'V1' },
      }),
    );

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.TYPED_SIGN_V1);
  });

  it('returns TYPED_SIGN_V3_V4 location for signTypedData with V3 version', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: TransactionType.signTypedData,
        requestData: { version: 'V3' },
      }),
    );

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.TYPED_SIGN_V3_V4);
  });

  it('returns STAKING_DEPOSIT location for staking deposit transactions', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.stakingDeposit,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.STAKING_DEPOSIT);
  });

  it('returns STAKING_WITHDRAWAL location for staking unstake transactions', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.stakingUnstake,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(
      CONFIRMATION_EVENT_LOCATIONS.STAKING_WITHDRAWAL,
    );
  });

  it('returns STAKING_CLAIM location for staking claim transactions', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.stakingClaim,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.STAKING_CLAIM);
  });

  it.each([
    [TransactionType.simpleSend],
    [TransactionType.tokenMethodTransfer],
    [TransactionType.tokenMethodTransferFrom],
  ])('returns TRANSFER location for %s transactions', (transactionType) => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: transactionType,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.TRANSFER);
  });

  it.each([
    [TransactionType.tokenMethodApprove],
    [TransactionType.tokenMethodSetApprovalForAll],
    [TransactionType.tokenMethodIncreaseAllowance],
  ])('returns APPROVE location for %s transactions', (transactionType) => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: transactionType,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.APPROVE);
  });

  it('returns CONTRACT_DEPLOYMENT location for contract deployment transactions', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.deployContract,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(
      CONFIRMATION_EVENT_LOCATIONS.CONTRACT_DEPLOYMENT,
    );
  });

  it('defaults to CONTRACT_INTERACTION for unknown transaction types', () => {
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: 'unknownType' as TransactionType,
    } as unknown as TransactionMeta);

    const { result } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(
      CONFIRMATION_EVENT_LOCATIONS.CONTRACT_INTERACTION,
    );
  });

  it('updates location when approval request changes', () => {
    // Initial render with personal sign
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: TransactionType.personalSign,
        requestData: {},
      }),
    );

    const { result, rerender } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.PERSONAL_SIGN);

    // Update to typed sign
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: TransactionType.signTypedData,
        requestData: { version: 'V1' },
      }),
    );

    rerender();
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.TYPED_SIGN_V1);
  });

  it('updates location when transaction metadata changes', () => {
    // Initial render with staking deposit
    mockUseApprovalRequest.mockReturnValue(
      createApprovalRequestMock({
        type: ApprovalType.Transaction,
        requestData: {},
      }),
    );

    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.stakingDeposit,
    } as unknown as TransactionMeta);

    const { result, rerender } = renderHook(() => useConfirmationLocation());
    expect(result.current).toBe(CONFIRMATION_EVENT_LOCATIONS.STAKING_DEPOSIT);

    // Update to staking unstake
    mockUseTransactionMetadataRequest.mockReturnValue({
      type: TransactionType.stakingUnstake,
    } as unknown as TransactionMeta);

    rerender();
    expect(result.current).toBe(
      CONFIRMATION_EVENT_LOCATIONS.STAKING_WITHDRAWAL,
    );
  });
});
