import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  approveERC20TransactionStateMock,
  approveERC20Permit2TransactionStateMock,
  approveAllERC721TransactionStateMock,
  increaseAllowanceERC20TransactionStateMock,
  decreaseAllowanceERC20TransactionStateMock,
} from '../../../../__mocks__/approve-transaction-mock';

import { ApproveAndPermit2 } from '../../../approve-static-simulations/approve-and-permit2';
import { SetApprovalForAll } from '../../../approve-static-simulations/set-approval-for-all';
import { IncreaseDecreaseAllowance } from '../../../approve-static-simulations/increase-decrease-allowance';

import { ApproveRow } from './approve-row';

jest.mock('../../../approve-static-simulations/approve-and-permit2');
jest.mock('../../../approve-static-simulations/set-approval-for-all');
jest.mock('../../../approve-static-simulations/increase-decrease-allowance');

describe('ApproveRow', () => {
  const mockApproveAndPermit2 = jest.mocked(ApproveAndPermit2);
  const mockSetApprovalForAll = jest.mocked(SetApprovalForAll);
  const mockIncreaseDecreaseAllowance = jest.mocked(IncreaseDecreaseAllowance);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correct method component for approve and permit2', async () => {
    renderWithProvider(<ApproveRow />, {
      state: approveERC20TransactionStateMock,
    });

    renderWithProvider(<ApproveRow />, {
      state: approveERC20Permit2TransactionStateMock,
    });

    expect(mockApproveAndPermit2).toHaveBeenCalledTimes(2);
    expect(mockSetApprovalForAll).not.toHaveBeenCalled();
    expect(mockIncreaseDecreaseAllowance).not.toHaveBeenCalled();
  });

  it('renders correct method component for set approval for all', async () => {
    renderWithProvider(<ApproveRow />, {
      state: approveAllERC721TransactionStateMock,
    });

    expect(mockSetApprovalForAll).toHaveBeenCalledTimes(1);
    expect(mockApproveAndPermit2).not.toHaveBeenCalled();
    expect(mockIncreaseDecreaseAllowance).not.toHaveBeenCalled();
  });

  it('renders correct method component for increase allowance or decrease allowance', async () => {
    renderWithProvider(<ApproveRow />, {
      state: increaseAllowanceERC20TransactionStateMock,
    });

    renderWithProvider(<ApproveRow />, {
      state: decreaseAllowanceERC20TransactionStateMock,
    });

    expect(mockIncreaseDecreaseAllowance).toHaveBeenCalledTimes(2);
    expect(mockApproveAndPermit2).not.toHaveBeenCalled();
    expect(mockSetApprovalForAll).not.toHaveBeenCalled();
  });
});
