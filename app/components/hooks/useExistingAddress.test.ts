import { renderHook } from '@testing-library/react-native';

import useExistingAddress from './useExistingAddress';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: any) =>
    fn({
      engine: {
        backgroundState: {
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
            provider: {
              ticker: 'eth',
            },
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
    }),
}));

describe('useExistingAddress', () => {
  it('should return existing address from identities', async () => {
    const { result } = renderHook(() => useExistingAddress('0x0'));
    expect(result?.current?.name).toEqual('Account 1');
  });
  it('should return existing address from address book', async () => {
    const { result } = renderHook(() => useExistingAddress('0x1'));
    expect(result?.current?.name).toEqual('Account 2');
  });
  it('should return undefined for unknown address', async () => {
    const { result } = renderHook(() => useExistingAddress('0x2'));
    expect(result?.current).toBeUndefined();
  });
});
