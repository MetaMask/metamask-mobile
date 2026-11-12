import React from 'react';
import { merge } from 'lodash';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  approveERC20Permit2TransactionStateMock,
  approveERC20TransactionStateMock,
  approveERC721TransactionStateMock,
  revokeERC20Permit2TransactionStateMock,
  revokeERC20TransactionStateMock,
  revokeERC721TransactionStateMock,
} from '../../../__mocks__/approve-transaction-mock';
import {
  approvalSpenderMock,
  permit2TokenMock,
  shortenedPermit2TokenMock,
  shortenedSpenderMock,
  shortenedTokenAddressMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { buildPermit2ApproveTransactionData } from '../../../__mocks__/helpers/approve';
import { useGetTokenStandardAndDetails } from '../../../hooks/useGetTokenStandardAndDetails';
import { TokenStandard } from '../../../types/token';
import { UINT48_MAX } from '../../../utils/date';
import { ApproveAndPermit2 } from './approve-and-permit2';
import { ApproveMethod } from '../../../types/approve';
// eslint-disable-next-line import-x/no-namespace
import * as useApproveTransactionDataModule from '../../../hooks/useApproveTransactionData';

jest.mock('../../../hooks/useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn(),
}));

const createPermit2StateMock = (
  expiration: number,
): typeof approveERC20Permit2TransactionStateMock =>
  merge({}, approveERC20Permit2TransactionStateMock, {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              txParams: {
                data: buildPermit2ApproveTransactionData(
                  permit2TokenMock,
                  approvalSpenderMock,
                  100,
                  expiration,
                ),
              },
            },
          ],
        },
      },
    },
  });

describe('ApproveAndPermit2', () => {
  const mockUseGetTokenStandardAndDetails = jest.mocked(
    useGetTokenStandardAndDetails,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC20,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
  });

  it('does not render if token standard is not ERC20 or ERC721', () => {
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC1155,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    const { queryByText } = renderWithProvider(<ApproveAndPermit2 />, {
      state: approveERC20TransactionStateMock,
    });
    expect(queryByText('Spending cap')).toBeNull();
  });

  it('renders spending cap and spender for ERC20', () => {
    const { getByText, queryByText } = renderWithProvider(
      <ApproveAndPermit2 />,
      { state: approveERC20TransactionStateMock },
    );
    expect(getByText('Spending cap')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Spender')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
    expect(queryByText('Expiration')).toBeNull();
  });

  it('renders edit spending cap button for ERC20', () => {
    const { getByTestId } = renderWithProvider(<ApproveAndPermit2 />, {
      state: approveERC20TransactionStateMock,
    });
    expect(getByTestId('edit-spending-cap-button')).toBeOnTheScreen();
  });

  it('renders withdraw and spender for ERC721', () => {
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC721,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    const { getByText, queryByTestId } = renderWithProvider(
      <ApproveAndPermit2 />,
      {
        state: approveERC721TransactionStateMock,
      },
    );
    expect(queryByTestId('edit-spending-cap-button')).toBeNull();
    expect(getByText('Withdraw')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Spender')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
  });

  it('renders with default values if transaction data is not present', () => {
    const mockUseApproveTransactionData = jest.spyOn(
      useApproveTransactionDataModule,
      'useApproveTransactionData',
    );
    mockUseApproveTransactionData.mockReturnValue({
      approveMethod: ApproveMethod.APPROVE,
      amount: undefined,
      decimals: undefined,
      tokenBalance: undefined,
      tokenStandard: TokenStandard.ERC20,
      rawAmount: undefined,
      spender: '0x123456789',
    } as ReturnType<
      typeof useApproveTransactionDataModule.useApproveTransactionData
    >);
    const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
      state: approveERC721TransactionStateMock,
    });
    // Just assert that the spender is rendered
    expect(getByText('0x12345...56789')).toBeTruthy();
  });

  it('formats large amounts with full precision', () => {
    const mockUseApproveTransactionData = jest.spyOn(
      useApproveTransactionDataModule,
      'useApproveTransactionData',
    );
    mockUseApproveTransactionData.mockReturnValue({
      approveMethod: ApproveMethod.APPROVE,
      amount: '1000000.123456',
      decimals: 18,
      tokenBalance: '0',
      tokenStandard: TokenStandard.ERC20,
      rawAmount: '1000000.123456',
      spender: '0x123456789',
      isLoading: false,
    } as ReturnType<
      typeof useApproveTransactionDataModule.useApproveTransactionData
    >);
    const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
      state: approveERC20TransactionStateMock,
    });
    expect(getByText('1,000,000.123456')).toBeTruthy();
  });

  it('displays Unlimited as-is without formatting', () => {
    const mockUseApproveTransactionData = jest.spyOn(
      useApproveTransactionDataModule,
      'useApproveTransactionData',
    );
    mockUseApproveTransactionData.mockReturnValue({
      approveMethod: ApproveMethod.APPROVE,
      amount: 'Unlimited',
      decimals: 18,
      tokenBalance: '0',
      tokenStandard: TokenStandard.ERC20,
      rawAmount: '0',
      spender: '0x123456789',
      isLoading: false,
    } as ReturnType<
      typeof useApproveTransactionDataModule.useApproveTransactionData
    >);
    const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
      state: approveERC20TransactionStateMock,
    });
    expect(getByText('Unlimited')).toBeTruthy();
  });

  describe('revoke', () => {
    it('renders spending cap and spender for ERC20', () => {
      const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
        state: revokeERC20TransactionStateMock,
      });
      expect(getByText('Spending cap')).toBeTruthy();
      expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
      expect(getByText('Permission from')).toBeTruthy();
      expect(getByText(shortenedSpenderMock)).toBeTruthy();
    });

    it('renders withdraw and spender for ERC721', () => {
      mockUseGetTokenStandardAndDetails.mockReturnValue({
        details: {
          standard: TokenStandard.ERC721,
          decimalsNumber: 0,
        },
        isPending: false,
      } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
      const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
        state: revokeERC721TransactionStateMock,
      });
      expect(getByText('NFTs')).toBeTruthy();
      expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    });
  });

  describe('permit2', () => {
    it('renders calldata token, amount, spender and expiration', () => {
      const { getByText, queryByText } = renderWithProvider(
        <ApproveAndPermit2 />,
        { state: approveERC20Permit2TransactionStateMock },
      );
      expect(getByText('Spending cap')).toBeTruthy();
      expect(getByText('100')).toBeTruthy();
      expect(getByText(shortenedPermit2TokenMock)).toBeTruthy();
      expect(queryByText(shortenedTokenAddressMock)).toBeNull();
      expect(getByText('Spender')).toBeTruthy();
      expect(getByText(shortenedSpenderMock)).toBeTruthy();
      expect(getByText('Expiration')).toBeTruthy();
      expect(getByText('08 May 2025, 09:32')).toBeTruthy();
    });

    it('renders never expires for the max expiration', () => {
      const { getByText, queryByText } = renderWithProvider(
        <ApproveAndPermit2 />,
        { state: createPermit2StateMock(UINT48_MAX) },
      );
      expect(getByText('Never expires')).toBeTruthy();
      expect(queryByText(String(UINT48_MAX))).toBeNull();
    });

    it('renders the current time for a zero expiration', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1746696740000);
      const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
        state: createPermit2StateMock(0),
      });
      expect(getByText('Expiration')).toBeTruthy();
      expect(getByText('08 May 2025, 09:32')).toBeTruthy();
    });

    it('renders calldata token for revoke', () => {
      const { getByText, queryByText } = renderWithProvider(
        <ApproveAndPermit2 />,
        { state: revokeERC20Permit2TransactionStateMock },
      );
      expect(getByText(shortenedPermit2TokenMock)).toBeTruthy();
      expect(queryByText(shortenedTokenAddressMock)).toBeNull();
      expect(getByText('Permission from')).toBeTruthy();
      expect(getByText(shortenedSpenderMock)).toBeTruthy();
      expect(queryByText('Expiration')).toBeNull();
    });

    it.each([TokenStandard.ERC721, undefined])(
      'does not render if token standard is %s',
      (standard) => {
        mockUseGetTokenStandardAndDetails.mockReturnValue({
          details: { standard, decimalsNumber: undefined },
          isPending: false,
        } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
        const { queryByText } = renderWithProvider(<ApproveAndPermit2 />, {
          state: approveERC20Permit2TransactionStateMock,
        });
        expect(queryByText('Withdraw')).toBeNull();
        expect(queryByText('Spending cap')).toBeNull();
        expect(queryByText(shortenedSpenderMock)).toBeNull();
        expect(queryByText('Expiration')).toBeNull();
      },
    );
  });
});
