import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { registerLegacyAssetControllerStateCompat } from './legacy-asset-state-compat';
import type { RootExtendedMessenger } from './types';

const mockState = { engine: { backgroundState: {} } };

jest.mock('../../store', () => ({
  store: { getState: () => mockState },
}));

jest.mock('../../selectors/assets/assets-migration', () => ({
  getCurrencyRateControllerCurrentCurrency: jest.fn(() => 'eur'),
  getCurrencyRateControllerCurrencyRates: jest.fn(() => ({
    ETH: { conversionRate: 2 },
  })),
  getMultiChainAssetsControllerAccountsAssets: jest.fn(() => ({
    id: ['solana:1/slip44:501'],
  })),
  getMultiChainAssetsControllerAssetsMetadata: jest.fn(() => ({
    'solana:1/slip44:501': { symbol: 'SOL' },
  })),
  getMultiChainAssetsControllerAllIgnoredAssets: jest.fn(() => ({})),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createRoot = (): any => new Messenger({ namespace: MOCK_ANY_NAMESPACE });

// The compat actions are typed in GlobalActions; the test root is untyped.
const callAction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messenger: any,
  action: string,
) => messenger.call(action);

describe('registerLegacyAssetControllerStateCompat', () => {
  it('serves CurrencyRateController:getState', () => {
    const root = createRoot();
    registerLegacyAssetControllerStateCompat(root as RootExtendedMessenger);

    expect(callAction(root, 'CurrencyRateController:getState')).toStrictEqual({
      currentCurrency: 'eur',
      currencyRates: { ETH: { conversionRate: 2 } },
    });
  });

  it('serves MultichainAssetsController:getState', () => {
    const root = createRoot();
    registerLegacyAssetControllerStateCompat(root as RootExtendedMessenger);

    expect(
      callAction(root, 'MultichainAssetsController:getState'),
    ).toStrictEqual({
      accountsAssets: { id: ['solana:1/slip44:501'] },
      assetsMetadata: { 'solana:1/slip44:501': { symbol: 'SOL' } },
      allIgnoredAssets: {},
    });
  });

  it('makes the handlers reachable from a delegated consumer messenger', () => {
    const root = createRoot();
    registerLegacyAssetControllerStateCompat(root as RootExtendedMessenger);
    const consumer = new Messenger({
      namespace: 'Consumer',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parent: root as any,
    });
    root.delegate({
      actions: ['CurrencyRateController:getState'],
      events: [],
      messenger: consumer,
    });

    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callAction(consumer as any, 'CurrencyRateController:getState'),
    ).toMatchObject({ currentCurrency: 'eur' });
  });

  it('can be registered on separate root messengers without conflict', () => {
    expect(() => {
      registerLegacyAssetControllerStateCompat(
        createRoot() as RootExtendedMessenger,
      );
      registerLegacyAssetControllerStateCompat(
        createRoot() as RootExtendedMessenger,
      );
    }).not.toThrow();
  });
});
