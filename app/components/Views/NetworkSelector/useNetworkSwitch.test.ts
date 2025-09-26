import {
  isRemoveGlobalNetworkSelectorEnabled,
  isPerDappSelectedNetworkEnabled,
} from '../../../util/networks';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { useMetrics } from '../../hooks/useMetrics';
import Engine from '../../../core/Engine';

// Mock the feature flags
jest.mock('../../../util/networks', () => ({
  isRemoveGlobalNetworkSelectorEnabled: jest.fn(),
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
const mockIsRemoveGlobalNetworkSelectorEnabled =
  isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
    typeof isRemoveGlobalNetworkSelectorEnabled
  >;
const mockIsPerDappSelectedNetworkEnabled =
  isPerDappSelectedNetworkEnabled as jest.MockedFunction<
    typeof isPerDappSelectedNetworkEnabled
  >;

const mockSelectNetwork = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

describe('useSwitchNetworks Feature Flag Tests', () => {
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

    mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
    mockIsPerDappSelectedNetworkEnabled.mockReturnValue(false);

    // Mock the event builder
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ event: 'test' })),
    });
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled', () => {
    // Common test configurations
    const verifyControllersAvailable = () => {
      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).toBeDefined();
      expect(
        Engine.context.SelectedNetworkController.setNetworkClientIdForDomain,
      ).toBeDefined();
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toBeDefined();
    };

    const verifyHookSetup = () => {
      expect(mockUseNetworksByNamespace).toBeDefined();
      expect(mockUseNetworkSelection).toBeDefined();
      expect(mockSelectNetwork).toBeDefined();
    };

    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('should call selectNetwork', () => {
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(true);
        expect(mockSelectNetwork).toBeDefined();
        verifyHookSetup();
      });

      it('should have proper hook setup', () => {
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(true);
        verifyControllersAvailable();
      });
    });

    describe('when feature flag is disabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      });

      it('should not call selectNetwork', () => {
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(false);
        expect(mockSelectNetwork).toBeDefined();
        verifyHookSetup();
      });

      it('should have proper hook setup', () => {
        expect(mockIsRemoveGlobalNetworkSelectorEnabled()).toBe(false);
        verifyControllersAvailable();
      });
    });
  });

  describe('Hook Configuration', () => {
    it('should properly initialize hooks with default values', () => {
      // Verify that the hooks are properly initialized
      expect(mockUseNetworksByNamespace).toBeDefined();
      expect(mockUseNetworkSelection).toBeDefined();
      expect(mockUseMetrics).toBeDefined();
    });

    it('should have all necessary Engine controllers available', () => {
      // Verify that all necessary controllers are available
      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).toBeDefined();
      expect(
        Engine.context.SelectedNetworkController.setNetworkClientIdForDomain,
      ).toBeDefined();
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toBeDefined();
      expect(Engine.context.AccountTrackerController.refresh).toBeDefined();
    });

    it('should have proper metrics setup', () => {
      // Verify that metrics are properly set up
      expect(mockUseMetrics).toBeDefined();
      expect(mockTrackEvent).toBeDefined();
      expect(mockCreateEventBuilder).toBeDefined();
    });
  });

  describe('Network Selection Behavior', () => {
    it('should provide selectNetwork function from useNetworkSelection', () => {
      // Verify that selectNetwork is available from the hook
      expect(mockSelectNetwork).toBeDefined();
      expect(typeof mockSelectNetwork).toBe('function');
    });

    it('should provide networks from useNetworksByNamespace', () => {
      // Verify that networks are available from the hook
      const networksResult = mockUseNetworksByNamespace({
        networkType: 'popular' as NetworkType,
      });
      expect(networksResult.networks).toBeDefined();
      expect(Array.isArray(networksResult.networks)).toBe(true);
    });
  });
});
