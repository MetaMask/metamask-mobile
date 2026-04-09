import { mockNetworkState } from '../../../util/test/network';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../Analytics';
import { switchToNetwork } from './ethereum-chain-utils';
import { getDefaultCaip25CaveatValue } from '../../Permissions';

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
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
    },
  },
}));

describe('switchToNetwork', () => {
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
});
