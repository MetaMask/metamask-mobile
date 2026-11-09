import { getUnifiedBalanceForAccountGroup } from '../../../../selectors/assets/balances';
import type { RootState } from '../../../../reducers';
import { selectUnifiedBalancesByAccountGroup } from './selectUnifiedBalancesByAccountGroup';

jest.mock('../../../../selectors/assets/balances', () => ({
  getUnifiedBalanceForAccountGroup: jest.fn(
    (_assets: unknown, _tree: unknown, groupId: string) => ({
      walletId: groupId.split('/')[0],
      groupId,
      totalBalanceInUserCurrency: 750,
      userCurrency: 'usd',
    }),
  ),
}));

const state = {
  engine: {
    backgroundState: {
      AccountTreeController: {
        accountTree: {
          wallets: {
            'wallet-1': {
              groups: {
                'wallet-1/group-1': { accounts: ['acc-1'] },
                'wallet-1/group-2': { accounts: ['acc-2'] },
              },
            },
            'wallet-2': {
              groups: {
                'wallet-2/group-1': { accounts: ['acc-3'] },
              },
            },
          },
        },
        selectedAccountGroup: 'wallet-1/group-1',
      },
    },
  },
} as unknown as RootState;

describe('selectUnifiedBalancesByAccountGroup', () => {
  beforeEach(() => {
    jest.mocked(getUnifiedBalanceForAccountGroup).mockClear();
  });

  it('uses the aggregated balance for every account group', () => {
    const result = selectUnifiedBalancesByAccountGroup()(state);

    expect(getUnifiedBalanceForAccountGroup).toHaveBeenCalledTimes(3);
    expect(result['wallet-1/group-1']).toEqual({
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 750,
      userCurrency: 'usd',
    });
    expect(result['wallet-1/group-2']?.groupId).toBe('wallet-1/group-2');
    expect(result['wallet-2/group-1']?.groupId).toBe('wallet-2/group-1');
  });

  it('filters to popular networks when chain ids are passed', () => {
    selectUnifiedBalancesByAccountGroup(['eip155:1'])(state);

    expect(getUnifiedBalanceForAccountGroup).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'wallet-1/group-1',
      { eip155: { '0x1': true } },
    );
  });

  it('returns an empty map when there is no account tree', () => {
    const empty = {
      engine: { backgroundState: {} },
    } as unknown as RootState;

    expect(selectUnifiedBalancesByAccountGroup()(empty)).toEqual({});
    expect(getUnifiedBalanceForAccountGroup).not.toHaveBeenCalled();
  });
});
