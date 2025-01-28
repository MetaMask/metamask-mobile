import { RootState } from '../../reducers';
import {
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
  selectIsSolanaSupportEnabled,
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
      solanaSupportEnabled: true,
    },
  } as unknown as RootState;

  describe('Multichain Support Flags', () => {
    it('should return bitcoin support enabled state', () => {
      expect(selectIsBitcoinSupportEnabled(mockState)).toBe(true);
    });

    it('should return bitcoin testnet support enabled state', () => {
      expect(selectIsBitcoinTestnetSupportEnabled(mockState)).toBe(false);
    });
    it('should return Solana support enabled state', () => {
      expect(selectIsSolanaSupportEnabled(mockState)).toBe(true);
    });
  });
});
