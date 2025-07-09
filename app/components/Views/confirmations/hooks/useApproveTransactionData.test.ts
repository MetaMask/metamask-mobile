import { cloneDeep } from 'lodash';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  approveERC20TransactionStateMock,
  revokeERC20TransactionStateMock,
  approveERC721TransactionStateMock,
  revokeERC721TransactionStateMock,
  decreaseAllowanceERC20TransactionStateMock,
  increaseAllowanceERC20TransactionStateMock,
  approveAllERC721TransactionStateMock,
  revokeAllERC721TransactionStateMock,
  approveERC20Permit2TransactionStateMock,
  revokeERC20Permit2TransactionStateMock,
} from '../__mocks__/approve-transaction-mock';
import { TokenStandard } from '../types/token';
import { ApproveMethod } from '../types/approve';
import { ZERO_ADDRESS } from '../constants/address';
import { useApproveTransactionData } from './useApproveTransactionData';
import { useGetTokenStandardAndDetails } from './useGetTokenStandardAndDetails';
import { useERC20TokenBalance } from './useERC20TokenBalance';

jest.mock('./useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn(),
}));

jest.mock('./useERC20TokenBalance', () => ({
  useERC20TokenBalance: jest.fn(),
}));

const mockedSpender = '0x9876543210987654321098765432109876543210';

describe('useApproveTransactionData', () => {
  const mockUseGetTokenStandardAndDetails = jest.mocked(
    useGetTokenStandardAndDetails,
  );
  const mockUseERC20TokenBalance = jest.mocked(useERC20TokenBalance);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC20,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    mockUseERC20TokenBalance.mockReturnValue({
      tokenBalance: '100',
      loading: false,
      error: false,
    } as unknown as ReturnType<typeof useERC20TokenBalance>);
  });

  describe('approve method', () => {
    describe('ERC20 token', () => {
      it('returns correct data approving ERC20 token', () => {
        const { result } = renderHookWithProvider(
          () => useApproveTransactionData(),
          {
            state: approveERC20TransactionStateMock,
          },
        );

        const {
          isLoading,
          isRevoke,
          tokenStandard,
          approveMethod,
          spender,
          amount,
          tokenBalance,
        } = result.current;

        expect(isLoading).toBe(false);
        expect(isRevoke).toBe(false);
        expect(tokenStandard).toBe(TokenStandard.ERC20);
        expect(approveMethod).toBe(ApproveMethod.APPROVE);
        expect(spender).toBe(mockedSpender);
        expect(amount).toBe('100');
        expect(tokenBalance).toBe('100');
      });

      it('returns correct data revoking ERC20 token', () => {
        const { result } = renderHookWithProvider(
          () => useApproveTransactionData(),
          {
            state: revokeERC20TransactionStateMock,
          },
        );

        const {
          isLoading,
          isRevoke,
          tokenStandard,
          approveMethod,
          spender,
          amount,
        } = result.current;

        expect(isLoading).toBe(false);
        expect(isRevoke).toBe(true);
        expect(tokenStandard).toBe(TokenStandard.ERC20);
        expect(approveMethod).toBe(ApproveMethod.APPROVE);
        expect(spender).toBe(mockedSpender);
        expect(amount).toBe('0');
      });
    });

    describe('ERC721 token', () => {
      beforeEach(() => {
        mockUseGetTokenStandardAndDetails.mockReturnValue({
          details: {
            standard: TokenStandard.ERC721,
          },
          isPending: false,
        } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
      });

      it('returns correct data approving ERC721 token', () => {
        mockUseGetTokenStandardAndDetails.mockReturnValue({
          details: {
            standard: TokenStandard.ERC721,
          },
          isPending: false,
        } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
        const { result } = renderHookWithProvider(
          () => useApproveTransactionData(),
          {
            state: approveERC721TransactionStateMock,
          },
        );

        const {
          isLoading,
          isRevoke,
          tokenStandard,
          approveMethod,
          spender,
          tokenId,
        } = result.current;

        expect(isLoading).toBe(false);
        expect(isRevoke).toBe(false);
        expect(tokenStandard).toBe(TokenStandard.ERC721);
        expect(approveMethod).toBe(ApproveMethod.APPROVE);
        expect(spender).toBe(mockedSpender);
        expect(tokenId).toBe('1');
      });

      it('returns correct data revoking ERC721 token', () => {
        const { result } = renderHookWithProvider(
          () => useApproveTransactionData(),
          {
            state: revokeERC721TransactionStateMock,
          },
        );

        const {
          isLoading,
          isRevoke,
          tokenStandard,
          approveMethod,
          spender,
          tokenId,
        } = result.current;

        expect(isLoading).toBe(false);
        expect(isRevoke).toBe(true);
        expect(tokenStandard).toBe(TokenStandard.ERC721);
        expect(approveMethod).toBe(ApproveMethod.APPROVE);
        expect(spender).toBe(ZERO_ADDRESS);
        expect(tokenId).toBe('1');
      });
    });
  });

  it('returns correct data decreasing allowance', () => {
    const { result } = renderHookWithProvider(
      () => useApproveTransactionData(),
      {
        state: decreaseAllowanceERC20TransactionStateMock,
      },
    );

    const {
      isLoading,
      isRevoke,
      tokenStandard,
      approveMethod,
      spender,
      amount,
    } = result.current;

    expect(isLoading).toBe(false);
    expect(isRevoke).toBe(false);
    expect(tokenStandard).toBe(TokenStandard.ERC20);
    expect(approveMethod).toBe(ApproveMethod.DECREASE_ALLOWANCE);
    expect(spender).toBe(mockedSpender);
    expect(amount).toBe('100');
  });

  it('returns correct data increasing allowance', () => {
    const { result } = renderHookWithProvider(
      () => useApproveTransactionData(),
      {
        state: increaseAllowanceERC20TransactionStateMock,
      },
    );

    const {
      isLoading,
      isRevoke,
      tokenStandard,
      approveMethod,
      spender,
      amount,
    } = result.current;

    expect(isLoading).toBe(false);
    expect(isRevoke).toBe(false);
    expect(tokenStandard).toBe(TokenStandard.ERC20);
    expect(approveMethod).toBe(ApproveMethod.INCREASE_ALLOWANCE);
    expect(spender).toBe(mockedSpender);
    expect(amount).toBe('100');
  });

  describe('set approval for all method', () => {
    beforeEach(() => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: TokenStandard.ERC721,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    });

    it('returns correct data setting approval for all', () => {
      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: approveAllERC721TransactionStateMock,
        },
      );

      const { isLoading, isRevoke, tokenStandard, approveMethod, spender } =
        result.current;

      expect(isLoading).toBe(false);
      expect(isRevoke).toBe(false);
      expect(tokenStandard).toBe(TokenStandard.ERC721);
      expect(approveMethod).toBe(ApproveMethod.SET_APPROVAL_FOR_ALL);
      expect(spender).toBe(mockedSpender);
    });

    it('returns correct data revoking approval for all', () => {
      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: revokeAllERC721TransactionStateMock,
        },
      );

      const { isLoading, isRevoke, tokenStandard, approveMethod, spender } =
        result.current;

      expect(isLoading).toBe(false);
      expect(isRevoke).toBe(true);
      expect(tokenStandard).toBe(TokenStandard.ERC721);
      expect(approveMethod).toBe(ApproveMethod.SET_APPROVAL_FOR_ALL);
      expect(spender).toBe(mockedSpender);
    });
  });

  describe('permit2 approve method', () => {
    beforeEach(() => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: TokenStandard.ERC20,
          decimalsNumber: 0,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    });

    it('returns correct data approving permit2 token', () => {
      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: approveERC20Permit2TransactionStateMock,
        },
      );

      const {
        isLoading,
        isRevoke,
        tokenStandard,
        approveMethod,
        spender,
        amount,
        expiration,
      } = result.current;

      expect(isLoading).toBe(false);
      expect(isRevoke).toBe(false);
      expect(tokenStandard).toBe(TokenStandard.ERC20);
      expect(approveMethod).toBe(ApproveMethod.PERMIT2_APPROVE);
      expect(spender).toBe(mockedSpender);
      expect(amount).toBe('100');
      expect(expiration).toBe('1746696740463');
    });

    it('returns correct data revoking permit2 token', () => {
      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: revokeERC20Permit2TransactionStateMock,
        },
      );

      const {
        isLoading,
        isRevoke,
        tokenStandard,
        approveMethod,
        spender,
        amount,
        expiration,
      } = result.current;

      expect(isLoading).toBe(false);
      expect(isRevoke).toBe(true);
      expect(tokenStandard).toBe(TokenStandard.ERC20);
      expect(approveMethod).toBe(ApproveMethod.PERMIT2_APPROVE);
      expect(spender).toBe(mockedSpender);
      expect(amount).toBe('0');
      expect(expiration).toBe('1746696740463');
    });
  });

  describe('loading state', () => {
    it('returns loading state when token standard is pending', () => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: undefined,
        },
        isPending: true,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);

      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: approveERC20TransactionStateMock,
        },
      );

      const { isLoading } = result.current;

      expect(isLoading).toBe(true);
    });

    it('returns loading state when transaction metadata is not available', () => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: undefined,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);

      const clonedState = cloneDeep(approveERC20TransactionStateMock);

      clonedState.engine.backgroundState.TransactionController.transactions =
        [];

      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: clonedState,
        },
      );

      const { isLoading } = result.current;

      expect(isLoading).toBe(true);
    });

    it('returns loading state when txParams.data is not available', () => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: undefined,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);

      const clonedState = cloneDeep(approveERC20TransactionStateMock);

      clonedState.engine.backgroundState.TransactionController.transactions[0].txParams.data =
        undefined;

      const { result } = renderHookWithProvider(
        () => useApproveTransactionData(),
        {
          state: clonedState,
        },
      );

      const { isLoading } = result.current;

      expect(isLoading).toBe(true);
    });
  });
});
