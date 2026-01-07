import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  approveERC20TransactionStateMock,
  approveERC721TransactionStateMock,
  revokeERC20TransactionStateMock,
  revokeERC721TransactionStateMock,
} from '../../../__mocks__/approve-transaction-mock';
import {
  shortenedSpenderMock,
  shortenedTokenAddressMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { useGetTokenStandardAndDetails } from '../../../hooks/useGetTokenStandardAndDetails';
import { TokenStandard } from '../../../types/token';
import { ApproveAndPermit2 } from './approve-and-permit2';
import { ApproveMethod } from '../../../types/approve';
// eslint-disable-next-line import/no-namespace
import * as useApproveTransactionDataModule from '../../../hooks/useApproveTransactionData';

jest.mock('../../../hooks/useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn(),
}));

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
    const { getByText } = renderWithProvider(<ApproveAndPermit2 />, {
      state: approveERC20TransactionStateMock,
    });
    expect(getByText('Spending cap')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Spender')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
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
});
