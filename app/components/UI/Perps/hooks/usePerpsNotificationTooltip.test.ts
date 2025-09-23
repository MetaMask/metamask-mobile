import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { usePerpsNotificationTooltip } from './usePerpsNotificationTooltip';
import Engine from '../../../../core/Engine';
import { act } from '@testing-library/react-native';
import type { NotificationServicesControllerState } from '@metamask/notification-services-controller/notification-services';

// Mock notifications feature flag
jest.mock('../../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: jest.fn().mockReturnValue(true),
}));

// Mock Redux dependencies
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => selector),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      markFirstOrderCompleted: jest.fn(),
    },
  },
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock selectors
jest.mock('../../../../selectors/notifications', () => ({
  selectIsPerpsNotificationsEnabled: jest.fn(),
}));

jest.mock('../controllers/selectors', () => ({
  selectHasPlacedFirstOrder: jest.fn(),
}));

// Mock the usePerpsSelector implementation
jest.mock('./usePerpsSelector', () => ({
  usePerpsSelector: jest.fn((selector) => selector),
}));

describe('usePerpsNotificationTooltip', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupHook = (
    perpsNotificationsEnabled: boolean,
    hasPlacedFirstOrder: boolean,
  ) => {
    // Set up mock return values for selectors
    const mockedUseSelector = jest.requireMock('react-redux').useSelector;
    mockedUseSelector.mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (
          selector ===
          jest.requireMock('../../../../selectors/notifications')
            .selectIsPerpsNotificationsEnabled
        ) {
          return perpsNotificationsEnabled;
        }
        return undefined;
      },
    );

    // Set up mock return values for usePerpsSelector
    const mockedUsePerpsSelector =
      jest.requireMock('./usePerpsSelector').usePerpsSelector;
    mockedUsePerpsSelector.mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (
          selector ===
          jest.requireMock('../controllers/selectors').selectHasPlacedFirstOrder
        ) {
          return hasPlacedFirstOrder;
        }
        return undefined;
      },
    );

    // Create a minimal state
    const state: DeepPartial<RootState> = {
      engine: {
        backgroundState: {
          NotificationServicesController: {
            isPerpsNotificationsEnabled: perpsNotificationsEnabled,
          } as unknown as NotificationServicesControllerState,
          PerpsController: {
            hasPlacedFirstOrder: {
              testnet: hasPlacedFirstOrder,
              mainnet: hasPlacedFirstOrder,
            },
          },
        },
      },
    };

    return renderHookWithProvider(() => usePerpsNotificationTooltip(), {
      state,
    });
  };

  it('should calculate shouldShowTooltip correctly - show when first order and notifications disabled', () => {
    const { result } = setupHook(false, false);
    expect(result.current.shouldShowTooltip).toBe(true);
    expect(result.current.isVisible).toBe(false);
  });

  it('should calculate shouldShowTooltip correctly - hide when not first order', () => {
    const { result } = setupHook(false, true);
    expect(result.current.shouldShowTooltip).toBe(false);
    expect(result.current.isVisible).toBe(false);
  });

  it('should calculate shouldShowTooltip correctly - hide when notifications enabled', () => {
    const { result } = setupHook(true, false);
    expect(result.current.shouldShowTooltip).toBe(false);
    expect(result.current.isVisible).toBe(false);
  });

  it('should make tooltip visible when showTooltip is called', () => {
    const { result } = setupHook(false, false);
    expect(result.current.isVisible).toBe(false);

    act(() => {
      result.current.showTooltip();
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('should not make tooltip visible when showTooltip is called but shouldShowTooltip is false', () => {
    const { result } = setupHook(true, true);
    expect(result.current.shouldShowTooltip).toBe(false);
    expect(result.current.isVisible).toBe(false);

    act(() => {
      result.current.showTooltip();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should make tooltip invisible when hideTooltip is called', () => {
    const { result } = setupHook(false, false);

    // First make visible
    act(() => {
      result.current.showTooltip();
    });
    expect(result.current.isVisible).toBe(true);

    // Then hide
    act(() => {
      result.current.hideTooltip();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should call PerpsController.markFirstOrderCompleted when markFirstOrderCompleted is called', () => {
    const { result } = setupHook(false, false);

    result.current.markFirstOrderCompleted();

    expect(
      Engine.context.PerpsController.markFirstOrderCompleted,
    ).toHaveBeenCalled();
  });

  it('should set isVisible to false when markFirstOrderCompleted is called', () => {
    const { result } = setupHook(false, false);

    // First make visible
    act(() => {
      result.current.showTooltip();
    });
    expect(result.current.isVisible).toBe(true);

    // Mark completed should also hide tooltip
    act(() => {
      result.current.markFirstOrderCompleted();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should expose hasPlacedFirstOrder from the selector', () => {
    const { result: resultWithoutFirstOrder } = setupHook(false, false);
    expect(resultWithoutFirstOrder.current.hasPlacedFirstOrder).toBe(false);

    const { result: resultWithFirstOrder } = setupHook(false, true);
    expect(resultWithFirstOrder.current.hasPlacedFirstOrder).toBe(true);
  });
});
