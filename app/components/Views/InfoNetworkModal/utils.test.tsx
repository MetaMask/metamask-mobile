import { InteractionManager } from 'react-native';
import { handleNetworkSwitch } from './utils';

// Mock dependencies
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn(),
  },
}));

describe('handleNetworkSwitch', () => {
  const mockDispatch = jest.fn();
  const mockInteractionManager = InteractionManager as jest.Mocked<
    typeof InteractionManager
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock InteractionManager to immediately execute the callback by default
    mockInteractionManager.runAfterInteractions.mockImplementation(
      (callback) => {
        if (callback && typeof callback === 'function') {
          callback();
        }
        return {
          then: jest.fn(),
          done: jest.fn(),
          cancel: jest.fn(),
        };
      },
    );
  });

  it('dispatches toggleInfoNetworkModal when network is not onboarded and not on bridge route', () => {
    // Arrange
    const networkOnboarded = false;
    const isOnBridgeRoute = false;

    // Act
    handleNetworkSwitch(mockDispatch, networkOnboarded, isOnBridgeRoute);

    // Assert
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_INFO_NETWORK_MODAL',
      show: true,
    });
  });

  it('does not dispatch when network is already onboarded', () => {
    // Arrange
    const networkOnboarded = true;
    const isOnBridgeRoute = false;

    // Act
    handleNetworkSwitch(mockDispatch, networkOnboarded, isOnBridgeRoute);

    // Assert
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when user is on bridge route', () => {
    // Arrange
    const networkOnboarded = false;
    const isOnBridgeRoute = true;

    // Act
    handleNetworkSwitch(mockDispatch, networkOnboarded, isOnBridgeRoute);

    // Assert
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when both network is onboarded and user is on bridge route', () => {
    // Arrange
    const networkOnboarded = true;
    const isOnBridgeRoute = true;

    // Act
    handleNetworkSwitch(mockDispatch, networkOnboarded, isOnBridgeRoute);

    // Assert
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
