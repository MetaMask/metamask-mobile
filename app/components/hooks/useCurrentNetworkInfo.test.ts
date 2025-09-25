import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import { useCurrentNetworkInfo } from './useCurrentNetworkInfo';

const mockUseNetworkEnablement = jest.fn();
const mockSelectNetworkConfigurationsByCaipChainId = jest.fn();
const mockSelectMultichainAccountsState2Enabled = jest.fn();

jest.mock('./useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => mockUseNetworkEnablement(),
}));

jest.mock('../../selectors/networkController', () => {
  const actual = jest.requireActual('../../selectors/networkController');
  return {
    ...actual,
    selectNetworkConfigurationsByCaipChainId: (state: unknown) =>
      (mockSelectNetworkConfigurationsByCaipChainId as jest.Mock)(state),
  };
});

jest.mock('../../selectors/featureFlagController/multichainAccounts', () => {
  const actual = jest.requireActual(
    '../../selectors/featureFlagController/multichainAccounts',
  );
  return {
    ...actual,
    selectMultichainAccountsState2Enabled: (state: unknown) =>
      (mockSelectMultichainAccountsState2Enabled as jest.Mock)(state),
  };
});

describe('useCurrentNetworkInfo', () => {
  const SOL_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);

    mockSelectNetworkConfigurationsByCaipChainId.mockReturnValue({
      'eip155:1': { name: 'Ethereum Mainnet' },
      'eip155:137': { name: 'Polygon' },
      [SOL_MAINNET]: { name: 'Solana Mainnet' },
    });

    mockUseNetworkEnablement.mockReturnValue({
      namespace: 'eip155',
      enabledNetworksByNamespace: {
        eip155: { '0x1': true, '0x89': false },
        solana: { [SOL_MAINNET]: true },
      },
    });
  });

  it('returns enabledNetworks for current namespace when feature flag is disabled', () => {
    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());

    expect(result.current.enabledNetworks).toEqual(
      expect.arrayContaining([{ chainId: '0x1', enabled: true }]),
    );
    expect(result.current.enabledNetworks.length).toBe(1);
    expect(result.current.hasEnabledNetworks).toBe(true);
    expect(result.current.isDisabled).toBe(false);
  });

  it('merges enabled networks across namespaces when feature flag is enabled', () => {
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());

    const chainIds = result.current.enabledNetworks.map((n) => n.chainId);
    expect(chainIds).toEqual(expect.arrayContaining(['0x1', SOL_MAINNET]));
    expect(result.current.enabledNetworks.length).toBe(2);
  });

  it('getNetworkInfo returns CAIP id and name for first enabled network', () => {
    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());

    const info = result.current.getNetworkInfo(0);
    expect(info).toEqual({
      caipChainId: 'eip155:1',
      networkName: 'Ethereum Mainnet',
    });
  });

  it('getNetworkInfo returns null when index out of range', () => {
    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());

    expect(result.current.getNetworkInfo(999)).toBeNull();
  });

  it('getNetworkInfoByChainId returns CAIP id and name when found', () => {
    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());

    const info = result.current.getNetworkInfoByChainId('0x1');
    expect(info).toEqual({
      caipChainId: 'eip155:1',
      networkName: 'Ethereum Mainnet',
    });
  });

  it('getNetworkInfoByChainId returns null when chainId is not enabled', () => {
    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());

    expect(result.current.getNetworkInfoByChainId('0x999')).toBeNull();
  });

  it('hasEnabledNetworks is false when no enabled networks', () => {
    mockUseNetworkEnablement.mockReturnValue({
      namespace: 'eip155',
      enabledNetworksByNamespace: { eip155: {} },
    });

    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());
    expect(result.current.enabledNetworks.length).toBe(0);
    expect(result.current.hasEnabledNetworks).toBe(false);
  });

  it('getNetworkInfo uses empty name when network config missing', () => {
    mockSelectNetworkConfigurationsByCaipChainId.mockReturnValue({});
    const { result } = renderHookWithProvider(() => useCurrentNetworkInfo());
    expect(result.current.getNetworkInfo(0)).toEqual({
      caipChainId: 'eip155:1',
      networkName: '',
    });
  });
});
