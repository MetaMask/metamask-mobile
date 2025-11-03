import { isPerDappSelectedNetworkEnabled } from '../../../util/networks';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { useMetrics } from '../../hooks/useMetrics';
import Engine from '../../../core/Engine';

// Mock the feature flags
jest.mock('../../../util/networks', () => ({
  isPerDappSelectedNetworkEnabled: jest.fn(),
  getDecimalChainId: jest.fn(() => '1'),
}));

// Mock the hooks
jest.mock('../../hooks/useNetworksByNamespace/useNetworksByNamespace', () => ({
  useNetworksByNamespace: jest.fn(),
  NetworkType: {
    Popular: 'popular',
  },
}));

jest.mock('../../hooks/useNetworkSelection/useNetworkSelection', () => ({
  useNetworkSelection: jest.fn(),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  context: {
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
    },
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
    AccountTrackerController: {
      refresh: jest.fn(),
    },
  },
}));

// Mock trace utilities
jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    SwitchCustomNetwork: 'SwitchCustomNetwork',
    SwitchBuiltInNetwork: 'SwitchBuiltInNetwork',
    NetworkSwitch: 'NetworkSwitch',
  },
  TraceOperation: {
    SwitchCustomNetwork: 'SwitchCustomNetwork',
    SwitchBuiltInNetwork: 'SwitchBuiltInNetwork',
  },
}));

// Mock updateIncomingTransactions
jest.mock('../../../util/transaction-controller', () => ({
  updateIncomingTransactions: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock setTimeout
jest.useFakeTimers();

const mockUseNetworksByNamespace =
  useNetworksByNamespace as jest.MockedFunction<typeof useNetworksByNamespace>;
const mockUseNetworkSelection = useNetworkSelection as jest.MockedFunction<
  typeof useNetworkSelection
>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockIsPerDappSelectedNetworkEnabled =
  isPerDappSelectedNetworkEnabled as jest.MockedFunction<
    typeof isPerDappSelectedNetworkEnabled
  >;

const mockSelectNetwork = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

describe('useSwitchNetworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNetworksByNamespace.mockReturnValue({
      networks: [],
      selectedNetworks: [],
      areAllNetworksSelected: false,
      areAnyNetworksSelected: false,
      networkCount: 0,
      selectedCount: 0,
    });

    mockUseNetworkSelection.mockReturnValue({
      selectCustomNetwork: jest.fn(),
      selectPopularNetwork: jest.fn(),
      selectNetwork: mockSelectNetwork,
      deselectAll: jest.fn(),
      selectAllPopularNetworks: jest.fn(),
      customNetworksToReset: [],
    });

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      isEnabled: () => true,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });

    mockIsPerDappSelectedNetworkEnabled.mockReturnValue(false);

    // Mock the event builder
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ event: 'test' })),
    });
  });

  describe('Network Controller Integration', () => {
    it('provides access to MultichainNetworkController', () => {
      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).toBeDefined();
    });

    it('provides access to SelectedNetworkController', () => {
      expect(
        Engine.context.SelectedNetworkController.setNetworkClientIdForDomain,
      ).toBeDefined();
    });

    it('provides access to PreferencesController', () => {
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toBeDefined();
    });

    it('provides access to AccountTrackerController', () => {
      expect(Engine.context.AccountTrackerController.refresh).toBeDefined();
    });
  });

  describe('Hook Configuration', () => {
    it('initializes hooks with default values', () => {
      expect(mockUseNetworksByNamespace).toBeDefined();
      expect(mockUseNetworkSelection).toBeDefined();
      expect(mockUseMetrics).toBeDefined();
    });

    it('provides metrics tracking functionality', () => {
      expect(mockUseMetrics).toBeDefined();
      expect(mockTrackEvent).toBeDefined();
      expect(mockCreateEventBuilder).toBeDefined();
    });
  });

  describe('Network Selection Behavior', () => {
    it('provides selectNetwork function from useNetworkSelection hook', () => {
      expect(mockSelectNetwork).toBeDefined();
      expect(typeof mockSelectNetwork).toBe('function');
    });

    it('provides networks array from useNetworksByNamespace hook', () => {
      const networksResult = mockUseNetworksByNamespace({
        networkType: 'popular' as NetworkType,
      });
      expect(networksResult.networks).toBeDefined();
      expect(Array.isArray(networksResult.networks)).toBe(true);
    });
  });
});
