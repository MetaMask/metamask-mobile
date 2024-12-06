import { RootState } from '../../reducers';
import {
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
} from './multichainNonEvm';

describe('MultichainNonEvm Selectors', () => {
  const mockState: RootState = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: '0xAddress1',
            accounts: {
              '0xAddress1': {
                address: '0xAddress1',
              },
            },
          },
        },
      },
    },
    multichainSettings: {
      bitcoinSupportEnabled: true,
      bitcoinTestnetSupportEnabled: false,
    },
  } as unknown as RootState;

  describe('Bitcoin Support Flags', () => {
    it('should return bitcoin support enabled state', () => {
      expect(selectIsBitcoinSupportEnabled(mockState)).toBe(true);
    });

    it('should return bitcoin testnet support enabled state', () => {
      expect(selectIsBitcoinTestnetSupportEnabled(mockState)).toBe(false);
    });
  });
});
