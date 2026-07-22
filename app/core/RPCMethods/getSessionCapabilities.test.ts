import { getCapabilities } from '@metamask/eip-5792-middleware';
import { getPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import {
  buildGetCapabilitiesHooks,
  clearSessionCapabilitiesCache,
  getPermittedEip155ChainIds,
  getSessionCapabilities,
} from './getSessionCapabilities';
import Engine from '../Engine';
import { store } from '../../store';
import { selectSmartTransactionsEnabled } from '../../selectors/smartTransactionsController';
import { isRelaySupported } from '../../util/transactions/transaction-relay';

jest.mock('@metamask/eip-5792-middleware', () => ({
  getCapabilities: jest.fn(),
}));

jest.mock('@metamask/chain-agnostic-permission', () => ({
  Caip25CaveatType: 'authorizedScopes',
  Caip25EndowmentPermissionName: 'endowment:caip25',
  getPermittedEthChainIds: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  ALLOWED_BRIDGE_CHAIN_IDS: ['0x1'],
}));

jest.mock('../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: jest.fn(),
}));

jest.mock('../../util/transactions/transaction-relay', () => ({
  isRelaySupported: jest.fn(),
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({ engine: { backgroundState: {} } })),
  },
}));

jest.mock('../Engine', () => ({
  controllerMessenger: {},
  context: {
    PreferencesController: {
      state: {
        dismissSmartAccountSuggestionEnabled: false,
      },
    },
    TransactionController: {
      isAtomicBatchSupported: jest.fn(),
    },
    AccountsController: {
      getSelectedAccount: jest.fn(() => ({
        address: '0x1234567890123456789012345678901234567890',
      })),
    },
    PermissionController: {
      getCaveat: jest.fn(),
    },
  },
}));

const mockGetCapabilities = jest.mocked(getCapabilities);
const mockSelectSmartTransactionsEnabled = jest.mocked(
  selectSmartTransactionsEnabled,
);
const SELECTED_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('getSessionCapabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSessionCapabilitiesCache();
    Engine.context.PreferencesController.state.dismissSmartAccountSuggestionEnabled = false;
  });

  describe('buildGetCapabilitiesHooks', () => {
    it('wires getDismissSmartAccountSuggestionEnabled to the PreferencesController state', () => {
      const hooks = buildGetCapabilitiesHooks();

      Engine.context.PreferencesController.state.dismissSmartAccountSuggestionEnabled = true;
      expect(hooks.getDismissSmartAccountSuggestionEnabled()).toBe(true);

      Engine.context.PreferencesController.state.dismissSmartAccountSuggestionEnabled = false;
      expect(hooks.getDismissSmartAccountSuggestionEnabled()).toBe(false);
    });

    it('wires getIsSmartTransaction to the smart transactions selector', () => {
      mockSelectSmartTransactionsEnabled.mockReturnValue(true);

      const hooks = buildGetCapabilitiesHooks();
      const result = hooks.getIsSmartTransaction('0x1');

      expect(result).toBe(true);
      expect(mockSelectSmartTransactionsEnabled).toHaveBeenCalledWith(
        store.getState(),
        '0x1',
      );
    });

    it('wires isRelaySupported to the transaction-relay helper', () => {
      const hooks = buildGetCapabilitiesHooks();

      expect(hooks.isRelaySupported).toBe(isRelaySupported);
    });

    it('wires isAtomicBatchSupported to the TransactionController', async () => {
      const isAtomicBatchSupported = jest
        .mocked(Engine.context.TransactionController.isAtomicBatchSupported)
        .mockResolvedValue([]);

      const hooks = buildGetCapabilitiesHooks();
      await hooks.isAtomicBatchSupported({
        address: SELECTED_ADDRESS,
        chainIds: ['0x1'],
      });

      expect(isAtomicBatchSupported).toHaveBeenCalledWith({
        address: SELECTED_ADDRESS,
        chainIds: ['0x1'],
      });
    });

    it('maps the TransactionController result in getSendBundleSupportedChains', async () => {
      jest
        .mocked(Engine.context.TransactionController.isAtomicBatchSupported)
        .mockResolvedValue([
          { chainId: '0x1', isSupported: true },
          { chainId: '0x2', isSupported: false },
        ] as never);

      const hooks = buildGetCapabilitiesHooks();
      const result = await hooks.getSendBundleSupportedChains(['0x1', '0x2']);

      expect(
        Engine.context.TransactionController.isAtomicBatchSupported,
      ).toHaveBeenCalledWith({
        address: SELECTED_ADDRESS,
        chainIds: ['0x1', '0x2'],
      });
      expect(result).toStrictEqual({ '0x1': true, '0x2': false });
    });

    it('wires isAuxiliaryFundsSupported to ALLOWED_BRIDGE_CHAIN_IDS', () => {
      const hooks = buildGetCapabilitiesHooks();

      expect(hooks.isAuxiliaryFundsSupported('0x1')).toBe(true);
      expect(hooks.isAuxiliaryFundsSupported('0x2')).toBe(false);
    });

    it('uses the target address for getSendBundleSupportedChains when provided', async () => {
      const targetAddress = '0xAbcDef0123456789012345678901234567890123';
      jest
        .mocked(Engine.context.TransactionController.isAtomicBatchSupported)
        .mockResolvedValue([]);

      const hooks = buildGetCapabilitiesHooks(targetAddress);
      await hooks.getSendBundleSupportedChains(['0x1']);

      expect(
        Engine.context.TransactionController.isAtomicBatchSupported,
      ).toHaveBeenCalledWith({
        address: targetAddress,
        chainIds: ['0x1'],
      });
    });
  });

  describe('getSessionCapabilities', () => {
    it('calls the eip-5792 getCapabilities with the hooks, messenger, and address', async () => {
      const capabilities = { '0x1': { atomic: { status: 'supported' } } };
      mockGetCapabilities.mockReturnValue(capabilities as never);

      const result = await getSessionCapabilities(SELECTED_ADDRESS);

      expect(result).toBe(capabilities);
      expect(mockGetCapabilities).toHaveBeenCalledTimes(1);
      const [hooks, messenger, address, extra] =
        mockGetCapabilities.mock.calls[0];
      expect(hooks).toEqual(
        expect.objectContaining({
          getDismissSmartAccountSuggestionEnabled: expect.any(Function),
          getIsSmartTransaction: expect.any(Function),
          isAtomicBatchSupported: expect.any(Function),
          isRelaySupported: expect.any(Function),
          getSendBundleSupportedChains: expect.any(Function),
          isAuxiliaryFundsSupported: expect.any(Function),
        }),
      );
      expect(messenger).toBe(Engine.controllerMessenger);
      expect(address).toBe(SELECTED_ADDRESS);
      expect(extra).toBeUndefined();
    });

    it('threads the queried address into the send-bundle support hook', async () => {
      const targetAddress = '0xAbcDef0123456789012345678901234567890123';
      mockGetCapabilities.mockReturnValue({} as never);
      jest
        .mocked(Engine.context.TransactionController.isAtomicBatchSupported)
        .mockResolvedValue([]);

      getSessionCapabilities(targetAddress);

      const [hooks] = mockGetCapabilities.mock.calls[0];
      await hooks.getSendBundleSupportedChains(['0x1']);

      expect(
        Engine.context.TransactionController.isAtomicBatchSupported,
      ).toHaveBeenCalledWith({
        address: targetAddress,
        chainIds: ['0x1'],
      });
    });

    it('forwards chainIds to the eip-5792 getCapabilities', () => {
      mockGetCapabilities.mockReturnValue({} as never);

      getSessionCapabilities(SELECTED_ADDRESS, ['0x1', '0xa']);

      const [, , address, chainIds] = mockGetCapabilities.mock.calls[0];
      expect(address).toBe(SELECTED_ADDRESS);
      expect(chainIds).toStrictEqual(['0x1', '0xa']);
    });
  });

  describe('getSessionCapabilities caching', () => {
    const CAPABILITIES = { '0x1': { atomic: { status: 'supported' } } };
    const flushBackgroundRefresh = () => new Promise((r) => setTimeout(r, 0));

    it('caches per address and chain set, insensitive to order and casing', async () => {
      const upper = SELECTED_ADDRESS.toUpperCase();
      const other = '0xAbcDef0123456789012345678901234567890123';
      mockGetCapabilities.mockResolvedValue(CAPABILITIES as never);

      await getSessionCapabilities(SELECTED_ADDRESS, ['0x1', '0xa']);
      await getSessionCapabilities(SELECTED_ADDRESS, ['0xa', '0x1']);
      await getSessionCapabilities(upper, ['0x1', '0xa']);
      expect(mockGetCapabilities).toHaveBeenCalledTimes(1);
      await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);
      await getSessionCapabilities(other, ['0x1']);
      clearSessionCapabilitiesCache();
      await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);
      expect(mockGetCapabilities).toHaveBeenCalledTimes(4);
    });

    it('deduplicates concurrent in-flight computations', async () => {
      mockGetCapabilities.mockResolvedValue(CAPABILITIES as never);

      const [first, second] = await Promise.all([
        getSessionCapabilities(SELECTED_ADDRESS, ['0x1']),
        getSessionCapabilities(SELECTED_ADDRESS, ['0x1']),
      ]);

      expect(first).toBe(CAPABILITIES);
      expect(first).toBe(second);
      expect(mockGetCapabilities).toHaveBeenCalledTimes(1);
    });

    it('serves a stale value immediately and refreshes it in the background', async () => {
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
      const refreshed = { '0x1': { atomic: { status: 'ready' } } };
      mockGetCapabilities
        .mockResolvedValueOnce(CAPABILITIES as never)
        .mockResolvedValueOnce(refreshed as never);

      await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);
      dateNowSpy.mockReturnValue(300_001);
      const stale = await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);
      await flushBackgroundRefresh();
      const fresh = await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);

      expect(stale).toBe(CAPABILITIES);
      expect(fresh).toBe(refreshed);
      expect(mockGetCapabilities).toHaveBeenCalledTimes(2);
      dateNowSpy.mockRestore();
    });

    it('never caches failures and keeps the stale value when a refresh fails', async () => {
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
      mockGetCapabilities
        .mockRejectedValueOnce(new Error('rpc down') as never)
        .mockResolvedValueOnce(CAPABILITIES as never)
        .mockRejectedValueOnce(new Error('rpc down again') as never);

      await expect(
        getSessionCapabilities(SELECTED_ADDRESS, ['0x1']),
      ).rejects.toThrow('rpc down');
      await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);
      dateNowSpy.mockReturnValue(300_001); // stale: schedules failing refresh
      const stale = await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);
      await flushBackgroundRefresh();
      dateNowSpy.mockReturnValue(0); // fresh again: no further refresh
      const kept = await getSessionCapabilities(SELECTED_ADDRESS, ['0x1']);

      expect(stale).toBe(CAPABILITIES);
      expect(kept).toBe(CAPABILITIES);
      expect(mockGetCapabilities).toHaveBeenCalledTimes(3);
      dateNowSpy.mockRestore();
    });
  });

  describe('getPermittedEip155ChainIds', () => {
    it('returns the permitted eip155 chain ids from the CAIP-25 caveat', () => {
      const caveatValue = { requiredScopes: {}, optionalScopes: {} };
      jest
        .mocked(Engine.context.PermissionController.getCaveat)
        .mockReturnValue({
          type: 'authorizedScopes',
          value: caveatValue,
        } as never);
      jest.mocked(getPermittedEthChainIds).mockReturnValue(['0x1', '0x2105']);

      const result = getPermittedEip155ChainIds('https://dapp.example');

      expect(
        Engine.context.PermissionController.getCaveat,
      ).toHaveBeenCalledWith(
        'https://dapp.example',
        'endowment:caip25',
        'authorizedScopes',
      );
      expect(getPermittedEthChainIds).toHaveBeenCalledWith(caveatValue);
      expect(result).toStrictEqual(['0x1', '0x2105']);
    });

    it('returns undefined when the caveat lookup throws', () => {
      jest
        .mocked(Engine.context.PermissionController.getCaveat)
        .mockImplementation(() => {
          throw new Error('permission does not exist');
        });

      expect(
        getPermittedEip155ChainIds('https://dapp.example'),
      ).toBeUndefined();
    });
  });
});
