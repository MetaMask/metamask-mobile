/**
 * Unit tests for Perps account utilities
 * Tests EVM account filtering and selection helpers (pure functions)
 */
import {
  findEvmAccount,
  calculateWeightedReturnOnEquity,
} from './accountUtils';
import type { InternalAccount } from '@metamask/keyring-internal-api';

describe('accountUtils', () => {
  describe('findEvmAccount', () => {
    it('returns EVM account when found in account list', () => {
      const mockAccounts = [
        {
          address: '0x1234567890123456789012345678901234567890',
          id: 'account-1',
          type: 'btc:p2pkh',
          metadata: {
            name: 'Bitcoin Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
          id: 'account-2',
          type: 'eip155:eoa',
          metadata: {
            name: 'Ethereum Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
        {
          address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
          id: 'account-3',
          type: 'cosmos:secp256k1',
          metadata: {
            name: 'Cosmos Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
      ] as unknown as InternalAccount[];

      const result = findEvmAccount(mockAccounts);

      expect(result).toEqual(mockAccounts[1]);
    });

    it('returns null when no EVM account exists in account list', () => {
      const mockAccounts = [
        {
          address: '0x1234567890123456789012345678901234567890',
          id: 'account-1',
          type: 'btc:p2pkh',
          metadata: {
            name: 'Bitcoin Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
        {
          address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
          id: 'account-2',
          type: 'cosmos:secp256k1',
          metadata: {
            name: 'Cosmos Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
      ] as unknown as InternalAccount[];

      const result = findEvmAccount(mockAccounts);

      expect(result).toBeNull();
    });

    it('returns null when account list is empty', () => {
      const result = findEvmAccount([]);

      expect(result).toBeNull();
    });

    it('returns first EVM account when multiple EVM accounts exist', () => {
      const mockAccounts = [
        {
          address: '0x1111111111111111111111111111111111111111',
          id: 'account-1',
          type: 'eip155:eoa',
          metadata: {
            name: 'First EVM Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
        {
          address: '0x2222222222222222222222222222222222222222',
          id: 'account-2',
          type: 'eip155:eoa',
          metadata: {
            name: 'Second EVM Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
        {
          address: '0x3333333333333333333333333333333333333333',
          id: 'account-3',
          type: 'eip155:erc4337',
          metadata: {
            name: 'Third EVM Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
      ] as unknown as InternalAccount[];

      const result = findEvmAccount(mockAccounts);

      expect(result).toEqual(mockAccounts[0]);
    });

    it('correctly identifies EVM accounts by type prefix', () => {
      const mockAccounts = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          id: 'account-1',
          type: 'eip155:eoa',
          metadata: {
            name: 'EVM EOA',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          id: 'account-2',
          type: 'eip155:erc4337',
          metadata: {
            name: 'EVM ERC4337',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
      ] as unknown as InternalAccount[];

      const result = findEvmAccount(mockAccounts);

      // Should return first EVM account (any subtype starting with 'eip155:')
      expect(result).toEqual(mockAccounts[0]);
    });
  });

  describe('calculateWeightedReturnOnEquity', () => {
    it('returns "0" for empty array', () => {
      const result = calculateWeightedReturnOnEquity([]);
      expect(result).toBe('0');
    });

    it('calculates weighted ROE for single account with string inputs', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0',
        },
      ];

      // marginUsed = (100 / 10.0) * 100 = 1000
      // weightedROE = (10.0 / 100) * 1000 / 1000 = 10.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('10.0');
    });

    it('calculates weighted ROE for single account with number inputs', () => {
      const accounts = [
        {
          unrealizedPnl: 200,
          returnOnEquity: 20,
        },
      ];

      // marginUsed = (200 / 20.0) * 100 = 1000
      // weightedROE = (20.0 / 100) * 1000 / 1000 = 20.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('20.0');
    });

    it('calculates weighted ROE for multiple accounts', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0', // marginUsed = 1000
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: '20.0', // marginUsed = 1000
        },
        {
          unrealizedPnl: '150',
          returnOnEquity: '15.0', // marginUsed = 1000
        },
      ];

      // Account 1: ROE = 0.10, marginUsed = 1000, weighted = 100
      // Account 2: ROE = 0.20, marginUsed = 1000, weighted = 200
      // Account 3: ROE = 0.15, marginUsed = 1000, weighted = 150
      // Total weighted = 450, total margin = 3000
      // weightedROE = (450 / 3000) * 100 = 15.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('15.0');
    });

    it('calculates weighted ROE with different margin amounts', () => {
      const accounts = [
        {
          unrealizedPnl: '50',
          returnOnEquity: '10.0', // marginUsed = 500
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: '20.0', // marginUsed = 1000
        },
      ];

      // Account 1: ROE = 0.10, marginUsed = 500, weighted = 50
      // Account 2: ROE = 0.20, marginUsed = 1000, weighted = 200
      // Total weighted = 250, total margin = 1500
      // weightedROE = (250 / 1500) * 100 = 16.666... ≈ 16.7
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('16.7');
    });

    it('handles mixed string and number inputs', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: 10,
        },
        {
          unrealizedPnl: 200,
          returnOnEquity: '20.0',
        },
      ];

      // Account 1: ROE = 0.10, marginUsed = 1000, weighted = 100
      // Account 2: ROE = 0.20, marginUsed = 1000, weighted = 200
      // Total weighted = 300, total margin = 2000
      // weightedROE = (300 / 2000) * 100 = 15.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('15.0');
    });

    it('skips accounts with zero returnOnEquity', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0', // marginUsed = 1000
        },
        {
          unrealizedPnl: '0',
          returnOnEquity: '0', // Should be skipped
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: '20.0', // marginUsed = 1000
        },
      ];

      // Only accounts 1 and 3 are used
      // Account 1: ROE = 0.10, marginUsed = 1000, weighted = 100
      // Account 3: ROE = 0.20, marginUsed = 1000, weighted = 200
      // Total weighted = 300, total margin = 2000
      // weightedROE = (300 / 2000) * 100 = 15.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('15.0');
    });

    it('skips accounts with NaN unrealizedPnl', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0',
        },
        {
          unrealizedPnl: 'invalid',
          returnOnEquity: '20.0',
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: '20.0',
        },
      ];

      // Only accounts 1 and 3 are used
      // Account 1: ROE = 0.10, marginUsed = 1000, weighted = 100
      // Account 3: ROE = 0.20, marginUsed = 1000, weighted = 200
      // Total weighted = 300, total margin = 2000
      // weightedROE = (300 / 2000) * 100 = 15.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('15.0');
    });

    it('skips accounts with NaN returnOnEquity', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0',
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: 'invalid',
        },
        {
          unrealizedPnl: '300',
          returnOnEquity: '30.0',
        },
      ];

      // Only accounts 1 and 3 are used
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('20.0');
    });

    it('returns "0" when all accounts are invalid', () => {
      const accounts = [
        {
          unrealizedPnl: 'invalid',
          returnOnEquity: '10.0',
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: '0',
        },
        {
          unrealizedPnl: '300',
          returnOnEquity: 'invalid',
        },
      ];

      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('0');
    });

    it('handles negative unrealizedPnl correctly', () => {
      const accounts = [
        {
          unrealizedPnl: '-100',
          returnOnEquity: '-10.0', // marginUsed = 1000
        },
        {
          unrealizedPnl: '200',
          returnOnEquity: '20.0', // marginUsed = 1000
        },
      ];

      // Account 1: ROE = -0.10, marginUsed = 1000, weighted = -100
      // Account 2: ROE = 0.20, marginUsed = 1000, weighted = 200
      // Total weighted = 100, total margin = 2000
      // weightedROE = (100 / 2000) * 100 = 5.0
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('5.0');
    });

    it('handles decimal precision correctly', () => {
      const accounts = [
        {
          unrealizedPnl: '33.33',
          returnOnEquity: '11.11', // marginUsed ≈ 300
        },
        {
          unrealizedPnl: '66.67',
          returnOnEquity: '22.22', // marginUsed ≈ 300
        },
      ];

      const result = calculateWeightedReturnOnEquity(accounts);
      // Should round to 1 decimal place
      expect(result).toMatch(/^\d+\.\d$/);
    });

    it('skips accounts that result in zero or negative marginUsed', () => {
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0', // marginUsed = 1000
        },
        {
          unrealizedPnl: '-50',
          returnOnEquity: '10.0', // marginUsed = -500 (should be skipped)
        },
        {
          unrealizedPnl: '0',
          returnOnEquity: '5.0', // marginUsed = 0 (should be skipped)
        },
      ];

      // Only account 1 is used
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('10.0');
    });

    it('handles very small values correctly', () => {
      const accounts = [
        {
          unrealizedPnl: '0.01',
          returnOnEquity: '0.1', // marginUsed = 10
        },
        {
          unrealizedPnl: '0.02',
          returnOnEquity: '0.2', // marginUsed = 10
        },
      ];

      // Account 1: ROE = 0.001, marginUsed = 10, weighted = 0.01
      // Account 2: ROE = 0.002, marginUsed = 10, weighted = 0.02
      // Total weighted = 0.03, total margin = 20
      // weightedROE = (0.03 / 20) * 100 = 0.15, rounded to 0.1
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('0.1');
    });

    it('handles very large values correctly', () => {
      const accounts = [
        {
          unrealizedPnl: '1000000',
          returnOnEquity: '10.0', // marginUsed = 10000000
        },
        {
          unrealizedPnl: '2000000',
          returnOnEquity: '20.0', // marginUsed = 10000000
        },
      ];

      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('15.0');
    });

    it('weighted ROE sign depends on total unrealizedPnl, not total returnOnEquity', () => {
      // Example: Mixed positive and negative ROE accounts
      // Account 1: unrealizedPnl = 100, returnOnEquity = 10%, marginUsed = 1000
      // Account 2: unrealizedPnl = -50, returnOnEquity = -5%, marginUsed = 1000
      // Total unrealizedPnl = 50 (positive)
      // Total returnOnEquity = 10% + (-5%) = 5% (positive)
      // weightedROE = (50 / 2000) * 100 = 2.5% (positive)
      const accounts = [
        {
          unrealizedPnl: '100',
          returnOnEquity: '10.0',
        },
        {
          unrealizedPnl: '-50',
          returnOnEquity: '-5.0',
        },
      ];

      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('2.5');
    });

    it('weighted ROE can be negative when total unrealizedPnl is negative', () => {
      // Account 1: unrealizedPnl = -100, returnOnEquity = -10%, marginUsed = 1000
      // Account 2: unrealizedPnl = -50, returnOnEquity = -5%, marginUsed = 1000
      // Total unrealizedPnl = -150 (negative)
      // weightedROE = (-150 / 2000) * 100 = -7.5% (negative)
      const accounts = [
        {
          unrealizedPnl: '-100',
          returnOnEquity: '-10.0',
        },
        {
          unrealizedPnl: '-50',
          returnOnEquity: '-5.0',
        },
      ];

      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('-7.5');
    });

    it('demonstrates weighted ROE sign matches total unrealizedPnl sign', () => {
      // This test shows that weightedROE sign = sign(Σ(unrealizedPnl))
      // not sign(Σ(returnOnEquity))
      const accounts = [
        {
          unrealizedPnl: '200',
          returnOnEquity: '20.0', // marginUsed = 1000
        },
        {
          unrealizedPnl: '-100',
          returnOnEquity: '-10.0', // marginUsed = 1000
        },
      ];

      // Total unrealizedPnl = 200 + (-100) = 100 (positive)
      // weightedROE = (100 / 2000) * 100 = 5.0% (positive)
      // Even though we have both positive and negative ROE accounts
      const result = calculateWeightedReturnOnEquity(accounts);
      expect(result).toBe('5.0');
    });
  });
});
