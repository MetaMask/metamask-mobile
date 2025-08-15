import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import useSendDisabled from './useSendDisabled';

const mockState = {
  state: {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'evm-account-id',
            accounts: {
              'evm-account-id': {
                id: 'evm-account-id',
                type: 'eip155:eoa',
                address: '0x12345',
                metadata: {},
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            '0x12345': {
              '0x1': {
                '0x123': '0x5',
              },
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              '0x12345': {
                balance: '0xDE0B6B3A7640000',
              },
            },
          },
        },
      },
    },
  },
};

describe('useSendDisabled', () => {
  it('return field for sendDisabled', () => {
    const { result } = renderHookWithProvider(
      () => useSendDisabled(),
      mockState as ProviderValues,
    );
    expect(result.current).toStrictEqual({ sendDisabled: true });
  });
});
