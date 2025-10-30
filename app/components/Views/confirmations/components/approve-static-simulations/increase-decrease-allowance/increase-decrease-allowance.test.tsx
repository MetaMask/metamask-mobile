import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  increaseAllowanceERC20TransactionStateMock,
  decreaseAllowanceERC20TransactionStateMock,
  approveERC721TransactionStateMock,
} from '../../../__mocks__/approve-transaction-mock';
import {
  shortenedSpenderMock,
  shortenedTokenAddressMock,
} from '../../../__mocks__/controllers/transaction-controller-mock';
import { useGetTokenStandardAndDetails } from '../../../hooks/useGetTokenStandardAndDetails';
import { TokenStandard } from '../../../types/token';
import { ApproveMethod } from '../../../types/approve';
// eslint-disable-next-line import/no-namespace
import * as useApproveTransactionDataModule from '../../../hooks/useApproveTransactionData';
import { IncreaseDecreaseAllowance } from './increase-decrease-allowance';

jest.mock('../../../hooks/useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn(),
}));

describe('IncreaseDecreaseAllowance', () => {
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

  it('does not render if token standard is not ERC20', () => {
    mockUseGetTokenStandardAndDetails.mockReturnValue({
      details: {
        standard: TokenStandard.ERC721,
        decimalsNumber: 0,
      },
      isPending: false,
    } as unknown as ReturnType<typeof useGetTokenStandardAndDetails>);
    const { queryByText } = renderWithProvider(<IncreaseDecreaseAllowance />, {
      state: approveERC721TransactionStateMock,
    });
    expect(queryByText('Spending cap')).toBeNull();
  });

  it('renders spending cap and spender for increase allowance ERC20', () => {
    const { getByText } = renderWithProvider(<IncreaseDecreaseAllowance />, {
      state: increaseAllowanceERC20TransactionStateMock,
    });
    expect(getByText('Spending cap')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
    expect(getByText(shortenedTokenAddressMock)).toBeTruthy();
    expect(getByText('Spender')).toBeTruthy();
    expect(getByText(shortenedSpenderMock)).toBeTruthy();
  });

  it('renders spending cap and spender for decrease allowance ERC20', () => {
    const { getByText } = renderWithProvider(<IncreaseDecreaseAllowance />, {
      state: decreaseAllowanceERC20TransactionStateMock,
    });
    expect(getByText('Spending cap')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
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
      approveMethod: ApproveMethod.INCREASE_ALLOWANCE,
      amount: undefined,
      decimals: undefined,
      tokenBalance: undefined,
      tokenStandard: TokenStandard.ERC20,
      rawAmount: undefined,
      spender: '0x123456789',
    } as ReturnType<
      typeof useApproveTransactionDataModule.useApproveTransactionData
    >);
    const { getByText } = renderWithProvider(<IncreaseDecreaseAllowance />, {
      state: increaseAllowanceERC20TransactionStateMock,
    });
    // Just assert that the spender is rendered
    expect(getByText('0x12345...56789')).toBeTruthy();
  });
});
