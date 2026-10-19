import { renderHook, act } from '@testing-library/react-native';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import Logger from '../../../../util/Logger';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectEnabledNetworks } from '../../../../selectors/networkEnablementController';
import { useRefreshTokens } from './useRefreshTokens';

const mockGetAssets = jest.fn().mockResolvedValue({});

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: Record<string, never>) => unknown) =>
    selector({}),
  ),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);

jest.mock('../../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworks: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      getAssets: (...args: unknown[]) => mockGetAssets(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/Assets/accountGroupAssetLoader', () => ({
  FUNGIBLE_ASSET_TYPES: ['fungible'],
}));

const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const BITCOIN_CHAIN_ID = 'bip122:000000000019d6689c085ae165831e93';

const makeAccount = (
  id: string,
  type: InternalAccount['type'] = 'eip155:eoa',
): InternalAccount => ({ id, address: '0xabc', type }) as InternalAccount;

const evmAccount = makeAccount('evm-account');
const solAccount = makeAccount('sol-account', 'solana:data-account');
const btcAccount = makeAccount('btc-account', 'bip122:p2wpkh');

describe('useRefreshTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
    ).mockReturnValue([evmAccount, solAccount, btcAccount]);
    (selectEnabledNetworks as unknown as jest.Mock).mockReturnValue([
      'eip155:1',
      'eip155:137',
      SOLANA_CHAIN_ID,
      BITCOIN_CHAIN_ID,
    ]);
  });

  it('calls AssetsController.getAssets with selected group accounts and all enabled chains', async () => {
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(mockGetAssets).toHaveBeenCalledWith(
      [evmAccount, solAccount, btcAccount],
      {
        forceUpdate: true,
        chainIds: ['eip155:1', 'eip155:137', SOLANA_CHAIN_ID, BITCOIN_CHAIN_ID],
        assetTypes: ['fungible'],
      },
    );
  });

  it('does nothing when the selected group has no accounts', async () => {
    (
      selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
    ).mockReturnValue([]);
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('logs when AssetsController.getAssets rejects', async () => {
    mockGetAssets.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useRefreshTokens());

    await act(async () => {
      await result.current.refresh();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'useRefreshTokens: AssetsController.getAssets failed',
    );
  });
});
