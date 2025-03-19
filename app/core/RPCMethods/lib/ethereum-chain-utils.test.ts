import { mockNetworkState } from '../../../util/test/network';
import MetaMetrics from '../../Analytics/MetaMetrics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../Analytics';
import { switchToNetwork } from './ethereum-chain-utils';

jest.mock('../../Analytics/MetaMetrics');
jest.mock('../../Analytics/MetricsEventBuilder');

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

    const mockMultichainNetworkController = {
      setActiveNetwork: jest.fn(),
    };

    const mockPermissionController = {
      getCaveat: jest.fn(),
      hasPermission: jest.fn().mockReturnValue(true),
    };

    const mockSelectedNetworkController = {};

    const requestUserApproval = jest.fn();
    const analytics = {
      test: 'test',
    };
    const origin = 'test';
    const isAddNetworkFlow = false;

    await switchToNetwork({
      network: [networkClientId, network],
      chainId,
      controllers: {
        MultichainNetworkController: mockMultichainNetworkController,
        PermissionController: mockPermissionController,
        SelectedNetworkController: mockSelectedNetworkController,
      },
      requestUserApproval,
      analytics,
      origin,
      isAddNetworkFlow,
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
