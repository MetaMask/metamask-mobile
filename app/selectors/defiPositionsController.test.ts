import { KnownCaipNamespace } from '@metamask/utils';
import { RootState } from '../reducers';
import {
  selectDeFiPositionsByAddress,
  selectDefiPositionsByEnabledNetworks,
} from './defiPositionsController';

describe('defiPositionsController selectors', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
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

  const createMockState = (
    defiPositions: Record<string, Record<string, unknown>> = {},
    selectedAddress: string | undefined = mockAddress,
    enabledNetworks: Record<string, Record<string, boolean>> = {},
  ): RootState =>
    ({
      engine: {
        backgroundState: {
          DeFiPositionsController: {
            allDeFiPositions: defiPositions,
          },
          AccountsController: {
            internalAccounts: selectedAddress
              ? {
                  selectedAccount: `account-${selectedAddress}`,
                  accounts: {
                    [`account-${selectedAddress}`]: {
                      address: selectedAddress,
                      id: `account-${selectedAddress}`,
                      metadata: {
                        name: 'Account 1',
                        keyring: { type: 'HD Key Tree' },
                      },
                      methods: [],
                      type: 'eip155:eoa',
                    },
                  },
                }
              : {
                  selectedAccount: undefined,
                  accounts: {},
                },
          },
          NetworkEnablementController: {
            enabledNetworkMap: enabledNetworks,
          },
        },
      },
    } as unknown as RootState);

  describe('selectDeFiPositionsByAddress', () => {
    it('should return defi positions for the selected address', () => {
      const state = createMockState({
        [mockAddress]: mockDefiPositions,
      });

      const result = selectDeFiPositionsByAddress(state);
      expect(result).toEqual(mockDefiPositions);
    });

    it('should return undefined when no positions exist for the selected address', () => {
      const state = createMockState({
        [mockAddress2]: mockDefiPositions,
      });

      const result = selectDeFiPositionsByAddress(state);
      expect(result).toBeUndefined();
    });

    it('should return undefined when selected address is undefined', () => {
      const state = createMockState({}, undefined);
      const result = selectDeFiPositionsByAddress(state);
      expect(result).toBeUndefined();
    });

    it('should handle empty allDeFiPositions object', () => {
      const state = createMockState({});
      const result = selectDeFiPositionsByAddress(state);
      expect(result).toBeUndefined();
    });

    it('should return correct positions when switching between addresses', () => {
      const state1 = createMockState({
        [mockAddress]: mockDefiPositions,
        [mockAddress2]: {
          '0x1': {
            protocolId: 'protocol4',
            positions: [{ id: 'pos4', balance: '4000', token: 'ETH' }],
          },
        },
      });

      const result1 = selectDeFiPositionsByAddress(state1);
      expect(result1).toEqual(mockDefiPositions);

      const state2 = createMockState(
        {
          [mockAddress]: mockDefiPositions,
          [mockAddress2]: {
            '0x1': {
              protocolId: 'protocol4',
              positions: [{ id: 'pos4', balance: '4000', token: 'ETH' }],
            },
          },
        },
        mockAddress2,
      );

      const result2 = selectDeFiPositionsByAddress(state2);
      expect(result2).toEqual({
        '0x1': {
          protocolId: 'protocol4',
          positions: [{ id: 'pos4', balance: '4000', token: 'ETH' }],
        },
      });
    });
  });

  describe('selectDefiPositionsByEnabledNetworks', () => {
    it('should return positions only for enabled networks', () => {
      const state = createMockState(
        {
          [mockAddress]: mockDefiPositions,
        },
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': false,
            '0xa86a': true,
          },
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({
        '0x1': mockDefiPositions['0x1'],
        '0xa86a': mockDefiPositions['0xa86a'],
      });
      expect(result?.['0x89']).toBeUndefined();
    });

    it('should return empty object when no networks are enabled', () => {
      const state = createMockState(
        {
          [mockAddress]: mockDefiPositions,
        },
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': false,
            '0x89': false,
            '0xa86a': false,
          },
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({});
    });

    it('should return empty object when selected address is undefined', () => {
      // Create state with defi positions but no selected address
      const stateWithNoSelectedAccount = {
        engine: {
          backgroundState: {
            DeFiPositionsController: {
              allDeFiPositions: {
                [mockAddress]: mockDefiPositions,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: '', // Empty string to ensure no account is selected
                accounts: {},
              },
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': true,
                  '0x89': true,
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectDefiPositionsByEnabledNetworks(
        stateWithNoSelectedAccount,
      );
      // When selectedAddress is undefined, selector should return empty object
      expect(result).toEqual({});
    });

    it('should return empty object when no positions exist for address', () => {
      const state = createMockState({}, mockAddress, {
        [KnownCaipNamespace.Eip155]: {
          '0x1': true,
          '0x89': true,
        },
      });

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({});
    });

    it('should handle all networks enabled', () => {
      const state = createMockState(
        {
          [mockAddress]: mockDefiPositions,
        },
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
            '0xa86a': true,
          },
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual(mockDefiPositions);
    });

    it('should filter out positions for chains not in enabled networks', () => {
      const state = createMockState(
        {
          [mockAddress]: mockDefiPositions,
        },
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            // '0x89' not in enabled networks
            // '0xa86a' not in enabled networks
          },
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({
        '0x1': mockDefiPositions['0x1'],
      });
    });

    it('should handle empty enabled networks map', () => {
      const state = createMockState(
        {
          [mockAddress]: mockDefiPositions,
        },
        mockAddress,
        {
          // Empty enabled networks - need at least empty EIP155 namespace
          [KnownCaipNamespace.Eip155]: {},
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({});
    });

    it('should handle missing EIP155 namespace in enabled networks', () => {
      const state = createMockState(
        {
          [mockAddress]: mockDefiPositions,
        },
        mockAddress,
        {
          // No EIP155 namespace - should return empty object instead of throwing
          [KnownCaipNamespace.Solana]: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
          },
        },
      );

      // The selector should return an empty object when EIP155 namespace is missing
      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({});
    });

    it('should correctly filter when some networks are enabled and some are not', () => {
      const extendedPositions = {
        ...mockDefiPositions,
        '0x38': {
          protocolId: 'protocol4',
          positions: [{ id: 'pos4', balance: '4000', token: 'BNB' }],
        },
        '0xfa': {
          protocolId: 'protocol5',
          positions: [{ id: 'pos5', balance: '5000', token: 'FTM' }],
        },
      };

      const state = createMockState(
        {
          [mockAddress]: extendedPositions,
        },
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': false,
            '0xa86a': true,
            '0x38': false,
            '0xfa': true,
          },
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({
        '0x1': extendedPositions['0x1'],
        '0xa86a': extendedPositions['0xa86a'],
        '0xfa': extendedPositions['0xfa'],
      });
      expect(result?.['0x89']).toBeUndefined();
      expect(result?.['0x38']).toBeUndefined();
    });

    it('should return positions for chains that exist in both defi positions and enabled networks', () => {
      const state = createMockState(
        {
          [mockAddress]: {
            '0x1': mockDefiPositions['0x1'],
            '0x89': mockDefiPositions['0x89'],
          },
        },
        mockAddress,
        {
          [KnownCaipNamespace.Eip155]: {
            '0x1': true,
            '0x89': true,
            '0xa86a': true, // enabled but no positions
            '0x38': true, // enabled but no positions
          },
        },
      );

      const result = selectDefiPositionsByEnabledNetworks(state);
      expect(result).toEqual({
        '0x1': mockDefiPositions['0x1'],
        '0x89': mockDefiPositions['0x89'],
      });
      expect(result?.['0xa86a']).toBeUndefined();
      expect(result?.['0x38']).toBeUndefined();
    });
  });
});
