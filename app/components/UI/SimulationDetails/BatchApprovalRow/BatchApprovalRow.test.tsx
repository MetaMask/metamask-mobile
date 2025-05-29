import React from 'react';
import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as BatchApprovalUtils from '../../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import { AssetType } from '../types';
import BatchApprovalRow from './BatchApprovalRow';

const approvalData = [
  {
    asset: {
      type: 'ERC20' as AssetType.ERC20 | AssetType.ERC721 | AssetType.ERC1155,
      address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Hex,
      chainId: '0x1' as Hex,
    },
    amount: new BigNumber('-0.00001'),
    fiatAmount: null,
    isApproval: true,
    isAllApproval: false,
    isUnlimitedApproval: false,
    nestedTransactionIndex: 0,
  },
];

describe('BatchApprovalRow', () => {
  it('renders a balance change row', () => {
    jest
      .spyOn(BatchApprovalUtils, 'useBatchApproveBalanceChanges')
      .mockReturnValue({ value: approvalData, pending: false });
    const { getByText } = renderWithProvider(<BatchApprovalRow />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });

    expect(getByText('You approve')).toBeTruthy();
    expect(getByText('- 0.00001')).toBeTruthy();
  });
});
