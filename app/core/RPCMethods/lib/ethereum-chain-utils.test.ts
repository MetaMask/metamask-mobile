import { mockNetworkState } from '../../../util/test/network';
import MetaMetrics from '../../Analytics/MetaMetrics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../Analytics';
import { switchToNetwork } from './ethereum-chain-utils';
import { getDefaultCaip25CaveatValue } from '../../Permissions';

jest.mock('../../Analytics/MetaMetrics');
jest.mock('../../Analytics/MetricsEventBuilder');
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
    (MetaMetrics.getInstance as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    const mockAddProperties = jest.fn().mockReturnThis();
    const mockMetricsBuilderBuild = {};
    (MetricsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: mockAddProperties,
      build: jest.fn().mockReturnValue(mockMetricsBuilderBuild),
    });

    const mockHooks = {
      getCaveat: jest
        .fn()
        .mockReturnValue({ value: getDefaultCaip25CaveatValue() }),
      requestPermittedChainsPermissionIncrementalForOrigin: jest.fn(),
      hasApprovalRequestsForOrigin: jest.fn(),
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

    const requestUserApproval = jest.fn();
    const analytics = {
      test: 'test',
    };
    const origin = 'test';
    const autoApprove = false;

    await switchToNetwork({
      networkClientId,
      nativeCurrency: network.nativeCurrency,
      chainId,
      requestUserApproval,
      analytics,
      origin,
      autoApprove,
      hooks: mockHooks,
    });

    expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NETWORK_SWITCHED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      chain_id: '1',
      source: 'Custom Network API',
      symbol: 'ETH',
      test: 'test',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(mockMetricsBuilderBuild);
  });
});
