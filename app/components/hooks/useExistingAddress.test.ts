import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useExistingAddress from './useExistingAddress';
import initialBackgroundState from '../../util/test/initial-background-state.json';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0x0': {
            address: '0x0',
            name: 'Account 1',
          },
        },
      },
      NetworkController: {
        network: 1,
      },
      AddressBookController: {
        addressBook: {
          1: {
            '0x1': {
              address: '0x1',
              name: 'Account 2',
            },
          },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: any) => fn(mockInitialState),
}));

describe('useExistingAddress', () => {
  it('should return existing address from identities', async () => {
    const { result } = renderHookWithProvider(() => useExistingAddress('0x0'), {
      state: mockInitialState,
    });
    expect(result?.current?.name).toEqual('Account 1');
  });
  it('should return existing address from address book', async () => {
    const { result } = renderHookWithProvider(() => useExistingAddress('0x1'), {
      state: mockInitialState,
    });
    expect(result?.current?.name).toEqual('Account 2');
  });
  it('should return undefined address not in identities or address book', async () => {
    const { result } = renderHookWithProvider(() => useExistingAddress('0x2'), {
      state: mockInitialState,
    });
    expect(result?.current).toBeUndefined();
  });
});
