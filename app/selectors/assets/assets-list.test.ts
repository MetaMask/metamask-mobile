import type { RootState } from '../../reducers';
import { selectAssetsBySelectedAccountGroup } from './assets-list';

jest.mock('@metamask/assets-controllers', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

describe('selectAssetsBySelectedAccountGroup', () => {
  it('builds the initial state object', () => {
    const {
      selectAssetsBySelectedAccountGroup:
        mockSelectAssetsBySelectedAccountGroup,
    } = jest.requireMock('@metamask/assets-controllers');

    const mockResult = {};
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue(mockResult);

    const mockState = () =>
      ({
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {},
            },
            AccountsController: {
              accounts: {},
            },
            TokensController: {
              allTokens: {},
            },
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokenRatesController: {
              tokenRates: {},
            },
            MultichainAssetsController: {
              allAssets: {},
            },
            MultichainBalancesController: {
              allBalances: {},
            },
            MultichainAssetsRatesController: {
              allAssetsRates: {},
            },
            CurrencyRateController: {
              currencyRates: {},
            },
            NetworkController: {
              networks: {},
            },
            AccountTrackerController: {
              accountsByChainId: {},
            },
          },
        },
      } as unknown as RootState);

    const result = selectAssetsBySelectedAccountGroup(mockState());

    expect(mockSelectAssetsBySelectedAccountGroup).toHaveBeenCalledWith({
      accountTree: {},
      accounts: {},
      allTokens: {},
      tokenBalances: {},
      tokenRates: {},
      allAssets: {},
      allBalances: {},
      allAssetsRates: {},
      currencyRates: {},
      networks: {},
      accountsByChainId: {},
    });

    expect(result).toBe(mockResult);
  });
});
