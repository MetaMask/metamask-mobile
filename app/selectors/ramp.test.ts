import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import { AccountId } from '@metamask/accounts-controller';
import { EthScope } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  selectValidRampInternalAccountIds,
  selectRampWalletAddress,
} from './ramp';
import { RootState } from '../reducers';
// eslint-disable-next-line import/no-namespace
import * as MultichainAccountsSelectors from './multichainAccounts/accounts';
// eslint-disable-next-line import/no-namespace
import * as AccountsControllerSelectors from './accountsController';

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn(),
}));

describe('Ramp Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectValidRampInternalAccountIds', () => {
    const mockState = {} as RootState;
    const mockAccountId1 = 'account-1' as AccountId;
    const mockAccountId2 = 'account-2' as AccountId;
    const mockAccountId3 = 'account-3' as AccountId;

    const mockFormatChainIdToCaip = jest.requireMock(
      '@metamask/bridge-controller',
    ).formatChainIdToCaip;

    it('returns empty set when no asset is provided', () => {
      const result = selectValidRampInternalAccountIds.resultFunc(
        mockState,
        null,
      );

      expect(result).toEqual(new Set());
    });

    it('returns accounts for Solana asset scope', () => {
      const solanaAsset = {
        network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
      } as CryptoCurrency;

      mockFormatChainIdToCaip.mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      jest
        .spyOn(AccountsControllerSelectors, 'selectInternalAccountsByScope')
        .mockReturnValue([
          { id: mockAccountId1 },
          { id: mockAccountId2 },
        ] as InternalAccount[]);

      const result = selectValidRampInternalAccountIds.resultFunc(
        mockState,
        solanaAsset,
      );

      expect(result).toEqual(new Set([mockAccountId1, mockAccountId2]));
      expect(
        AccountsControllerSelectors.selectInternalAccountsByScope,
      ).toHaveBeenCalledWith(
        mockState,
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
    });

    it('returns accounts for EVM asset scope including wildcard', () => {
      const evmAsset = {
        network: { chainId: '0x1' },
      } as CryptoCurrency;

      mockFormatChainIdToCaip.mockReturnValue('eip155:1');

      jest
        .spyOn(AccountsControllerSelectors, 'selectInternalAccountsByScope')
        .mockImplementation((_state, scope) => {
          if (scope === 'eip155:1') {
            return [{ id: mockAccountId1 }] as InternalAccount[];
          }
          if (scope === EthScope.Eoa) {
            return [
              { id: mockAccountId2 },
              { id: mockAccountId3 },
            ] as InternalAccount[];
          }
          return [];
        });

      const result = selectValidRampInternalAccountIds.resultFunc(
        mockState,
        evmAsset,
      );

      expect(result).toEqual(
        new Set([mockAccountId1, mockAccountId2, mockAccountId3]),
      );
      expect(
        AccountsControllerSelectors.selectInternalAccountsByScope,
      ).toHaveBeenCalledWith(mockState, 'eip155:1');
      expect(
        AccountsControllerSelectors.selectInternalAccountsByScope,
      ).toHaveBeenCalledWith(mockState, EthScope.Eoa);
    });

    it('handles non-EVM asset without wildcard accounts', () => {
      const bitcoinAsset = {
        network: { chainId: 'bip122:000000000019d6689c085ae165831e93' },
      } as CryptoCurrency;

      mockFormatChainIdToCaip.mockReturnValue(
        'bip122:000000000019d6689c085ae165831e93',
      );

      jest
        .spyOn(AccountsControllerSelectors, 'selectInternalAccountsByScope')
        .mockReturnValue([{ id: mockAccountId1 }] as InternalAccount[]);

      const result = selectValidRampInternalAccountIds.resultFunc(
        mockState,
        bitcoinAsset,
      );

      expect(result).toEqual(new Set([mockAccountId1]));
      expect(
        AccountsControllerSelectors.selectInternalAccountsByScope,
      ).toHaveBeenCalledWith(
        mockState,
        'bip122:000000000019d6689c085ae165831e93',
      );
      expect(
        AccountsControllerSelectors.selectInternalAccountsByScope,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectRampWalletAddress', () => {
    const mockState = {} as RootState;
    const mockSelectedAddress = '0x123456789';
    const mockAssetAddress = '0xabcdefghi';

    const mockFormatChainIdToCaip = jest.requireMock(
      '@metamask/bridge-controller',
    ).formatChainIdToCaip;

    it('returns selected address when no asset is provided', () => {
      const result = selectRampWalletAddress.resultFunc(
        mockState,
        null,
        true,
        mockSelectedAddress,
      );

      expect(result).toBe(mockSelectedAddress);
    });

    it('returns selected address when multichain accounts is disabled', () => {
      const asset = {
        network: { chainId: '0x1' },
      } as CryptoCurrency;

      const result = selectRampWalletAddress.resultFunc(
        mockState,
        asset,
        false,
        mockSelectedAddress,
      );

      expect(result).toBe(mockSelectedAddress);
    });

    it('returns asset-specific address when multichain is enabled and account exists', () => {
      const asset = {
        network: { chainId: '0x1' },
      } as CryptoCurrency;

      mockFormatChainIdToCaip.mockReturnValue('eip155:1');

      const mockSelectSelectedInternalAccountByScope = jest
        .spyOn(
          MultichainAccountsSelectors,
          'selectSelectedInternalAccountByScope',
        )
        .mockReturnValue(
          () => ({ address: mockAssetAddress } as InternalAccount),
        );

      const result = selectRampWalletAddress.resultFunc(
        mockState,
        asset,
        true,
        mockSelectedAddress,
      );

      expect(result).toBe(mockAssetAddress);
      expect(mockSelectSelectedInternalAccountByScope).toHaveBeenCalledWith(
        mockState,
      );
      expect(mockFormatChainIdToCaip).toHaveBeenCalledWith('0x1');
    });

    it('returns selected address when multichain is enabled but no asset-specific account exists', () => {
      const asset = {
        network: { chainId: '0x1' },
      } as CryptoCurrency;

      mockFormatChainIdToCaip.mockReturnValue('eip155:1');

      jest
        .spyOn(
          MultichainAccountsSelectors,
          'selectSelectedInternalAccountByScope',
        )
        .mockReturnValue(() => undefined);

      const result = selectRampWalletAddress.resultFunc(
        mockState,
        asset,
        true,
        mockSelectedAddress,
      );

      expect(result).toBe(mockSelectedAddress);
    });

    it('handles Solana asset correctly', () => {
      const solanaAsset = {
        network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
      } as CryptoCurrency;

      const solanaAddress = 'solana-address-123';
      mockFormatChainIdToCaip.mockReturnValue(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      jest
        .spyOn(
          MultichainAccountsSelectors,
          'selectSelectedInternalAccountByScope',
        )
        .mockReturnValue(() => ({ address: solanaAddress } as InternalAccount));

      const result = selectRampWalletAddress.resultFunc(
        mockState,
        solanaAsset,
        true,
        mockSelectedAddress,
      );

      expect(result).toBe(solanaAddress);
      expect(mockFormatChainIdToCaip).toHaveBeenCalledWith(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
    });
  });
});
