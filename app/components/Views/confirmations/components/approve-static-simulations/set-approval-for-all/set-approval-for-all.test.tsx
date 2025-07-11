import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  approveAllERC721TransactionStateMock,
  revokeAllERC721TransactionStateMock,
  approveERC20TransactionStateMock,
} from '../../../__mocks__/approve-transaction-mock';
import {
  shortenedSpenderMock,
  shortenedTokenAddressMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { useGetTokenStandardAndDetails } from '../../../hooks/useGetTokenStandardAndDetails';
import { TokenStandard } from '../../../types/token';
import { SetApprovalForAll } from './set-approval-for-all';

jest.mock('../../../hooks/useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn(),
}));

describe('SetApprovalForAll', () => {
  const mockUseGetTokenStandardAndDetails = jest.mocked(
    useGetTokenStandardAndDetails,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC721,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
  });

  it('does not render if token standard is not ERC721 or ERC1155', () => {
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC20,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    const { queryByText } = renderWithProvider(<SetApprovalForAll />, {
      state: approveERC20TransactionStateMock,
    });
    expect(queryByText('NFTs')).toBeNull();
  });

  it('renders NFTs and spender for ERC721 approval for all', () => {
    const { getByText } = renderWithProvider(<SetApprovalForAll />, {
      state: approveAllERC721TransactionStateMock,
    });
    expect(getByText('NFTs')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Spender')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
  });

  it('renders NFTs and permission from for ERC721 revoke all', () => {
    const { getByText } = renderWithProvider(<SetApprovalForAll />, {
      state: revokeAllERC721TransactionStateMock,
    });
    expect(getByText('NFTs')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Permission from')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
  });

  it('renders for ERC1155 token standard', () => {
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC1155,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    const { getByText } = renderWithProvider(<SetApprovalForAll />, {
      state: approveAllERC721TransactionStateMock,
    });
    expect(getByText('NFTs')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Spender')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
  });
});
