import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  ProviderValues,
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import useSendActions from './useSendActions';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
      },
    },
  }),
}));

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

describe('useSendActions', () => {
  it('return function submitSend, cancelSend', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState as ProviderValues,
    );
    expect(result.current.handleSubmitPress).toBeDefined();
    expect(result.current.handleCancelPress).toBeDefined();
  });

  it('call navigation.goBack when cancelSend is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState as ProviderValues,
    );
    result.current.handleCancelPress();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
