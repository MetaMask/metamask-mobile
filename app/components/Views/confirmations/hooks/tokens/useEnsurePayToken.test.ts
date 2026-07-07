import { act } from '@testing-library/react-native';
import { merge } from 'lodash';
import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  accountMock,
  otherControllersMock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { useEnsurePayToken } from './useEnsurePayToken';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      addCustomAsset: jest.fn(),
      getAssets: jest.fn(),
    },
    TokenRatesController: {
      updateExchangeRates: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(() => false),
  }),
);

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(() => null),
  }),
);

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurations: jest.fn(() => ({})),
}));

const ACCOUNT_ID_MOCK = 'mock-account-id';
const TOKEN_ADDRESS_MOCK =
  '0x55d398326f99059fF775485246999027B3197955' as const;
const CHAIN_ID_MOCK = '0x38' as const; // BNB
const SYMBOL_MOCK = 'USDT';
const DECIMALS_MOCK = 18;
const NAME_MOCK = 'Tether USD';

function renderEnsurePayToken() {
  return renderHookWithProvider(() => useEnsurePayToken(), {
    state: merge({}, otherControllersMock),
  });
}

async function runEnsure(overrides: Partial<Record<string, unknown>> = {}) {
  const { result } = renderEnsurePayToken();

  await act(async () => {
    await result.current({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
      symbol: SYMBOL_MOCK,
      decimals: DECIMALS_MOCK,
      name: NAME_MOCK,
      ...overrides,
    });
  });
}

describe('useEnsurePayToken', () => {
  const mockAddCustomAsset = jest.mocked(
    Engine.context.AssetsController.addCustomAsset,
  );
  const mockGetAssets = jest.mocked(Engine.context.AssetsController.getAssets);
  const mockUpdateExchangeRates = jest.mocked(
    Engine.context.TokenRatesController.updateExchangeRates,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    mockAddCustomAsset.mockResolvedValue(undefined);
    mockGetAssets.mockResolvedValue({});
    mockUpdateExchangeRates.mockResolvedValue(undefined);

    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue({
      id: ACCOUNT_ID_MOCK,
      address: accountMock,
      type: 'eip155:eoa',
    });
    (selectNetworkConfigurations as unknown as jest.Mock).mockReturnValue({
      [CHAIN_ID_MOCK]: { nativeCurrency: 'BNB' },
    });
  });

  describe('unified assets state', () => {
    beforeEach(() => {
      (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
        true,
      );
    });

    it('registers the token via addCustomAsset', async () => {
      await runEnsure();

      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        ACCOUNT_ID_MOCK,
        expect.stringContaining('erc20'),
        {
          address: TOKEN_ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
          decimals: DECIMALS_MOCK,
          name: NAME_MOCK,
          symbol: SYMBOL_MOCK,
        },
      );
    });

    it('falls back to symbol when name is missing', async () => {
      await runEnsure({ name: undefined });

      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        ACCOUNT_ID_MOCK,
        expect.any(String),
        expect.objectContaining({ name: SYMBOL_MOCK }),
      );
    });

    it('refreshes the price via getAssets', async () => {
      await runEnsure();

      expect(mockGetAssets).toHaveBeenCalledWith(
        [expect.objectContaining({ id: ACCOUNT_ID_MOCK })],
        expect.objectContaining({
          dataTypes: ['price'],
          forceUpdate: true,
          assetsForPriceUpdate: [expect.stringContaining('erc20')],
        }),
      );
    });

    it('does not use the legacy TokenRatesController path', async () => {
      await runEnsure();

      expect(mockUpdateExchangeRates).not.toHaveBeenCalled();
    });

    it('skips registration and price when there is no EVM account', async () => {
      (
        selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
      ).mockReturnValue(null);

      await runEnsure();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('does not throw when addCustomAsset rejects', async () => {
      mockAddCustomAsset.mockRejectedValue(new Error('boom'));

      await expect(runEnsure()).resolves.toBeUndefined();
      expect(mockGetAssets).toHaveBeenCalled();
    });
  });

  describe('legacy assets state', () => {
    it('refreshes the rate via TokenRatesController.updateExchangeRates', async () => {
      await runEnsure();

      expect(mockUpdateExchangeRates).toHaveBeenCalledWith([
        { chainId: CHAIN_ID_MOCK, nativeCurrency: 'BNB' },
      ]);
    });

    it('does not use the unified path', async () => {
      await runEnsure();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockGetAssets).not.toHaveBeenCalled();
    });

    it('skips the rate refresh when the chain has no native currency', async () => {
      (selectNetworkConfigurations as unknown as jest.Mock).mockReturnValue({});

      await runEnsure();

      expect(mockUpdateExchangeRates).not.toHaveBeenCalled();
    });

    it('does not throw when updateExchangeRates rejects', async () => {
      mockUpdateExchangeRates.mockRejectedValue(new Error('boom'));

      await expect(runEnsure()).resolves.toBeUndefined();
    });
  });
});
