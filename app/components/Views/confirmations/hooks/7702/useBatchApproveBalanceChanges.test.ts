import BigNumber from 'bignumber.js';
import { TransactionMeta } from '@metamask/transaction-controller';
import { waitFor } from '@testing-library/react-native';

import {
  batchApprovalConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useBalanceChanges from '../../../../UI/SimulationDetails/useBalanceChanges';
import { AssetType } from '../../../../UI/SimulationDetails/types';
// eslint-disable-next-line import/no-namespace
import * as TokenUtils from '../../utils/token';
import { useBatchApproveBalanceChanges } from './useBatchApproveBalanceChanges';

jest.mock('../../../../UI/SimulationDetails/useBalanceChanges');

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
      },
    },
  },
}));

const mockApprovalRow = [
  {
    amount: new BigNumber('-0.00001'),
    asset: {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
      tokenId: undefined,
      type: 'ERC20',
    },
    fiatAmount: null,
    isAllApproval: false,
    isApproval: true,
    isUnlimitedApproval: false,
    nestedTransactionIndex: -1,
  },
];

function runHook(confirmation?: TransactionMeta) {
  const { result, rerender } = renderHookWithProvider(
    () => useBatchApproveBalanceChanges(),
    {
      state: getAppStateForConfirmation(
        confirmation ?? batchApprovalConfirmation,
      ),
    },
  );
  return { result: result.current, rerender };
}

describe('useBatchApproveBalanceChanges', () => {
  beforeEach(() => {
    jest
      .spyOn(TokenUtils, 'memoizedGetTokenStandardAndDetails')
      .mockResolvedValue({
        decimals: '18',
        standard: 'ERC20',
        symbol: 'DAI',
      } as TokenUtils.TokenDetailsERC20);
  });

  it('returns approval rows for the batched confirmation', async () => {
    const useBalanceChangesMock = jest.mocked(useBalanceChanges);
    useBalanceChangesMock.mockReturnValue({
      pending: false,
      value: [
        {
          amount: new BigNumber('-0.00001'),
          asset: {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: '0x1',
            tokenId: undefined,
            type: AssetType.ERC20,
          },
          fiatAmount: null,
        },
      ],
    });
    const { result } = runHook();
    await waitFor(() => {
      expect(result.value).toStrictEqual(mockApprovalRow);
    });
  });

  it('does not return approval row of transaction does not have it', async () => {
    const useBalanceChangesMock = jest.mocked(useBalanceChanges);
    useBalanceChangesMock.mockReturnValue({
      pending: false,
      value: [],
    });
    const { result } = runHook(upgradeAccountConfirmation);
    await waitFor(() => {
      expect(result.value).toStrictEqual([]);
    });
  });
});
