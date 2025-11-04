import { KnownCaipNamespace } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  selectDeFiPositionsByAddress,
  selectDefiPositionsByEnabledNetworks,
} from './defiPositionsController';

describe('defiPositionsController selectors', () => {
  const mockAddress1 = '0x1234567890123456789012345678901234567890';
  const mockAddress2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  const mockDefiPositions = {
    '0x1': {
      protocolId: 'protocol1',
      positions: [
        {
          id: 'pos1',
          balance: '1000',
          token: 'ETH',
        },
      ],
    },
    '0x89': {
      protocolId: 'protocol2',
      positions: [
        {
          id: 'pos2',
          balance: '2000',
          token: 'MATIC',
        },
      ],
    },
    '0xa86a': {
      protocolId: 'protocol3',
      positions: [
        {
          id: 'pos3',
          balance: '3000',
          token: 'AVAX',
        },
      ],
    },
  };

  const createMockState = ({
    selectedAccountGroup,
    defiPositions = {},
    enabledNetworks = {},
  }: {
    selectedAccountGroup:
      | 'entropy:wallet0/0'
      | 'entropy:wallet0/1'
      | 'entropy:wallet0/btc-only';
    defiPositions?: Record<string, Record<string, unknown> | null>;
    enabledNetworks?: Record<string, Record<string, boolean>>;
  }): RootState =>
    ({
      engine: {
        backgroundState: {
          DeFiPositionsController: {
            allDeFiPositions: defiPositions,
          },
          AccountTreeController: {
            accountTree: {
              selectedAccountGroup,
              wallets: {
                'entropy:wallet0': {
                  id: 'entropy:wallet0',
                  type: 'Entropy',
                  groups: {
                    'entropy:wallet0/0': {
                      id: 'entropy:wallet0/0',
                      accounts: [`account-${mockAddress1}`],
                    },
                    'entropy:wallet0/1': {
                      id: 'entropy:wallet0/1',
                      accounts: [`account-${mockAddress2}`],
                    },
                    'entropy:wallet0/btc-only': {
                      id: 'entropy:wallet0/btc-only',
                      accounts: [`account-btc`],
                    },
                  },
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                [`account-${mockAddress1}`]: {
                  id: `account-${mockAddress1}`,
                  address: mockAddress1,
                  scopes: ['eip155:0'],
                },
                [`account-${mockAddress2}`]: {
                  id: `account-${mockAddress2}`,
                  address: mockAddress2,
                  scopes: ['eip155:0'],
                },
                [`account-btc`]: {
                  id: `account-btc`,
                  address: 'btc',
                  scopes: ['bip122:0'],
                },
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: enabledNetworks,
          },
        },
      },
    }) as unknown as RootState;

  describe('selectDeFiPositionsByAddress', () => {
    it('returns defi positions for the selected address', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
        defiPositions: {
          [mockAddress1]: mockDefiPositions,
        },
      });

      const result = selectDeFiPositionsByAddress(state);
      expect(result).toStrictEqual(mockDefiPositions);
    });

    it('returns undefined when no positions exist for the selected address', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
        defiPositions: {
          [mockAddress2]: mockDefiPositions,
        },
      });

      const result = selectDeFiPositionsByAddress(state);
      expect(result).toBeUndefined();
    });

    it('returns empty object when there is no evm account in the selected account group', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/btc-only',
      });
      const result = selectDeFiPositionsByAddress(state);
      expect(result).toStrictEqual({});
    });
  });

  describe('selectDefiPositionsByEnabledNetworks', () => {
    it('returns positions only for enabled networks', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
        defiPositions: {
          [mockAddress1]: mockDefiPositions,
        },
        enabledNetworks: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': false,
            '0xa86a': true,
          },
        },
      });

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toStrictEqual({
        '0x1': mockDefiPositions['0x1'],
        '0xa86a': mockDefiPositions['0xa86a'],
      });
      expect(result?.['0x89']).toBeUndefined();
    });

    it('returns empty object when there is no evm account in the selected account group', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/btc-only',
      });

      const result = selectDefiPositionsByEnabledNetworks(state);

      expect(result).toStrictEqual({});
    });

    it('returns undefined when no positions exist for the selected address', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
      });

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toBeUndefined();
    });

    it('returns null when that is the value stored for that address', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
        defiPositions: {
          [mockAddress1]: null,
        },
      });

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toBeNull();
    });

    it('returns empty object when there are no evm networks', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
        defiPositions: {
          [mockAddress1]: mockDefiPositions,
        },
        enabledNetworks: {
          [KnownCaipNamespace.Bip122]: {
            'bip122:0': true,
          },
        },
      });

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toStrictEqual({});
    });

    it('returns empty object when no evm networks are enabled', () => {
      const state = createMockState({
        selectedAccountGroup: 'entropy:wallet0/0',
        defiPositions: {
          [mockAddress1]: mockDefiPositions,
        },
        enabledNetworks: {
          [KnownCaipNamespace.Eip155]: {
            '0x1': false,
            '0x89': false,
            '0xa86a': false,
          },
        },
      });

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toStrictEqual({});
    });
  });
});
