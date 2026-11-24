import { mockNetworkState } from '../../../util/test/network';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../Analytics';
import { switchToNetwork } from './ethereum-chain-utils';
import { getDefaultCaip25CaveatValue } from '../../Permissions';
import Engine from '../../Engine';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';

jest.mock('../../../util/analytics/analytics');
jest.mock('../../../util/analytics/AnalyticsEventBuilder');
jest.mock('../../../core/Permissions', () => ({
  ...jest.requireActual('../../../core/Permissions'),
  getPermittedAccounts: jest.fn().mockReturnValue([]),
}));
jest.mock('../../Engine', () => ({
  context: {
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    PermissionController: {
      grantPermissionsIncremental: jest.fn(),
      getCaveat: jest.fn(),
      updateCaveat: jest.fn(),
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
    },
  },
}));

const MockEngine = jest.mocked(Engine);

type TestCaveatValue = {
  requiredScopes: Record<string, { accounts: string[] }>;
  optionalScopes: Record<string, { accounts: string[] }>;
  sessionProperties: Record<string, unknown>;
  isMultichainOrigin: boolean;
};

const buildCaveatValue = (
  scopes: Record<string, string[]>,
): TestCaveatValue => ({
  requiredScopes: {},
  optionalScopes: Object.fromEntries(
    Object.entries(scopes).map(([scope, accounts]) => [
      scope,
      { accounts },
    ]),
  ),
  sessionProperties: {},
  isMultichainOrigin: false,
});

describe('switchToNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockEngine.context.PermissionController.getCaveat.mockImplementation(
      () => ({
        type: Caip25CaveatType,
        value: getDefaultCaip25CaveatValue(),
      }),
    );
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
  });

  it('tracks the network switch event', async () => {
    const mockTrackEvent = jest.fn();
    (analytics.trackEvent as jest.Mock) = mockTrackEvent;

    const mockAddProperties = jest.fn().mockReturnThis();
    const mockMetricsBuilderBuild = {};
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: mockAddProperties,
      build: jest.fn().mockReturnValue(mockMetricsBuilderBuild),
    });

    const fromChainId = '0x89';
    const mockHooks = {
      getCaveat: jest
        .fn()
        .mockReturnValue({ value: getDefaultCaip25CaveatValue() }),
      requestPermittedChainsPermissionIncrementalForOrigin: jest.fn(),
      hasApprovalRequestsForOrigin: jest.fn(),
      fromNetworkConfiguration: { chainId: fromChainId },
    };

    const chainId = '0x1';
    const {
      selectedNetworkClientId: networkClientId,
      networkConfigurationsByChainId: { [chainId]: network },
    } = mockNetworkState({
      chainId,
      id: 'Mainnet',
      nickname: 'Mainnet',
      ticker: 'ETH',
    });

    const analyticsParam = {
      test: 'test',
    };
    const origin = 'test';
    const autoApprove = false;

    await switchToNetwork({
      networkClientId,
      nativeCurrency: network.nativeCurrency,
      rpcUrl: network.rpcEndpoints[0].url,
      chainId,
      analytics: analyticsParam,
      origin,
      autoApprove,
      hooks: mockHooks,
    });

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NETWORK_SWITCHED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      chain_id: '1',
      source: 'Custom Network API',
      symbol: 'ETH',
      from_network: fromChainId,
      to_network: chainId,
      custom_network: false,
      test: 'test',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(mockMetricsBuilderBuild);
  });

  it('syncs the permitted accounts onto a newly granted chain', async () => {
    const account = '0x1111111111111111111111111111111111111111';
    const chainId = '0x89';
    const origin = 'https://example.dapp';

    const caveatValue = buildCaveatValue({
      'eip155:1': [`eip155:1:${account}`],
    });

    MockEngine.context.PermissionController.getCaveat.mockImplementation(
      () => ({
        type: Caip25CaveatType,
        value: caveatValue,
      }),
    );

    const mockGrant = jest.fn().mockImplementation(() => {
      // Mimic the real incremental grant: the new scope lands with no
      // accounts, which is the bug state this fix addresses.
      caveatValue.optionalScopes['eip155:137'] = { accounts: [] };
    });

    const mockHooks = {
      getCaveat: jest.fn().mockReturnValue({ value: caveatValue }),
      requestPermittedChainsPermissionIncrementalForOrigin: mockGrant,
      hasApprovalRequestsForOrigin: jest.fn(),
      fromNetworkConfiguration: { chainId: '0x1' },
    };

    const {
      selectedNetworkClientId: networkClientId,
      networkConfigurationsByChainId: { [chainId]: network },
    } = mockNetworkState({
      chainId,
      id: 'Polygon',
      nickname: 'Polygon',
      ticker: 'MATIC',
    });

    await switchToNetwork({
      networkClientId,
      nativeCurrency: network.nativeCurrency,
      rpcUrl: network.rpcEndpoints[0].url,
      chainId,
      analytics: {},
      origin,
      autoApprove: false,
      hooks: mockHooks,
    });

    expect(mockGrant).toHaveBeenCalledWith({
      chainId,
      autoApprove: false,
      metadata: { rpcUrl: network.rpcEndpoints[0].url },
    });

    const updateCaveat =
      MockEngine.context.PermissionController.updateCaveat;
    expect(updateCaveat).toHaveBeenCalledTimes(1);
    expect(updateCaveat).toHaveBeenCalledWith(
      origin,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
      expect.anything(),
    );
    const updatedValue = updateCaveat.mock.calls[0][3] as TestCaveatValue;
    expect(updatedValue.optionalScopes['eip155:137']).toEqual({
      accounts: [`eip155:137:${account}`],
    });
    expect(updatedValue.optionalScopes['eip155:1']).toEqual({
      accounts: [`eip155:1:${account}`],
    });
  });

  it('does not change the permission when the chain is already permitted', async () => {
    const account = '0x1111111111111111111111111111111111111111';
    const chainId = '0x89';
    const origin = 'https://example.dapp';

    const caveatValue = buildCaveatValue({
      'eip155:1': [`eip155:1:${account}`],
      'eip155:137': [`eip155:137:${account}`],
    });

    MockEngine.context.PermissionController.getCaveat.mockImplementation(
      () => ({
        type: Caip25CaveatType,
        value: caveatValue,
      }),
    );

    const mockGrant = jest.fn();

    const mockHooks = {
      getCaveat: jest.fn().mockReturnValue({ value: caveatValue }),
      requestPermittedChainsPermissionIncrementalForOrigin: mockGrant,
      hasApprovalRequestsForOrigin: jest.fn(),
      fromNetworkConfiguration: { chainId: '0x1' },
    };

    const {
      selectedNetworkClientId: networkClientId,
      networkConfigurationsByChainId: { [chainId]: network },
    } = mockNetworkState({
      chainId,
      id: 'Polygon',
      nickname: 'Polygon',
      ticker: 'MATIC',
    });

    await switchToNetwork({
      networkClientId,
      nativeCurrency: network.nativeCurrency,
      rpcUrl: network.rpcEndpoints[0].url,
      chainId,
      analytics: {},
      origin,
      autoApprove: false,
      hooks: mockHooks,
    });

    expect(mockGrant).not.toHaveBeenCalled();
    expect(
      MockEngine.context.PermissionController.updateCaveat,
    ).not.toHaveBeenCalled();
  });

  it('does not sync accounts when the origin has no permission yet', async () => {
    const chainId = '0x89';
    const origin = 'https://example.dapp';

    const mockGrant = jest.fn();

    const mockHooks = {
      getCaveat: jest.fn().mockReturnValue(undefined),
      requestPermittedChainsPermissionIncrementalForOrigin: mockGrant,
      hasApprovalRequestsForOrigin: jest.fn(),
      fromNetworkConfiguration: { chainId: '0x1' },
    };

    const {
      selectedNetworkClientId: networkClientId,
      networkConfigurationsByChainId: { [chainId]: network },
    } = mockNetworkState({
      chainId,
      id: 'Polygon',
      nickname: 'Polygon',
      ticker: 'MATIC',
    });

    await switchToNetwork({
      networkClientId,
      nativeCurrency: network.nativeCurrency,
      rpcUrl: network.rpcEndpoints[0].url,
      chainId,
      analytics: {},
      origin,
      autoApprove: false,
      hooks: mockHooks,
    });

    expect(mockGrant).toHaveBeenCalled();
    expect(
      MockEngine.context.PermissionController.updateCaveat,
    ).not.toHaveBeenCalled();
  });
});
