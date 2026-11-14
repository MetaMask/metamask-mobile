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
// eslint-disable-next-line import-x/no-namespace
import * as TokenUtils from '../../utils/token';
import { buildPermit2ApproveTransactionData } from '../../__mocks__/helpers/approve';
import {
  approvalSpenderMock,
  permit2TokenMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
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
    approveMethod: undefined,
    asset: {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
      tokenId: undefined,
      type: 'ERC20',
    },
    balance: new BigNumber('100'),
    fiatAmount: null,
    isAllApproval: false,
    isApproval: true,
    isUnlimitedApproval: false,
    nestedTransactionIndex: -1,
    tokenSymbol: 'DAI',
    usdAmount: null,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balance: '0x5' as any,
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
          balance: new BigNumber(100),
          tokenSymbol: 'DAI',
          usdAmount: null,
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

  it('uses the token from Permit2 calldata', async () => {
    const permit2Address = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
    const useBalanceChangesMock = jest.mocked(useBalanceChanges);
    useBalanceChangesMock.mockReturnValue({ pending: false, value: [] });

    runHook({
      ...batchApprovalConfirmation,
      nestedTransactions: [
        {
          data: buildPermit2ApproveTransactionData(
            permit2TokenMock,
            approvalSpenderMock,
            100,
            1746696740,
          ),
          to: permit2Address,
        },
      ],
    } as unknown as TransactionMeta);

    await waitFor(() => {
      expect(useBalanceChangesMock).toHaveBeenLastCalledWith({
        chainId: '0x1',
        networkClientId: 'mainnet',
        simulationData: {
          tokenBalanceChanges: [
            {
              address: permit2TokenMock,
              approveMethod: 'approve',
              difference: '0x64',
              id: undefined,
              isAll: false,
              isDecrease: true,
              isUnlimited: false,
              nestedTransactionIndex: 0,
              newBalance: '0x0',
              previousBalance: '0x5',
              standard: 'erc20',
              tokenSymbol: 'DAI',
            },
          ],
        },
      });
    });
    expect(TokenUtils.memoizedGetTokenStandardAndDetails).toHaveBeenCalledWith({
      tokenAddress: permit2TokenMock,
      userAddress: batchApprovalConfirmation.txParams.from,
    });
    expect(
      TokenUtils.memoizedGetTokenStandardAndDetails,
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ tokenAddress: permit2Address }),
    );
  });
});
