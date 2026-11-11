import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FastOnboarding from './FastOnboarding';

// Mock navigation hooks
const mockNavigation = {
  setParams: jest.fn(),
};

const mockRoute = {
  params: {},
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

describe('FastOnboarding Component', () => {
  // Mock props
  const mockProps = {
    onPressContinueWithGoogle: jest.fn(),
    onPressContinueWithApple: jest.fn(),
    onPressImport: jest.fn(),
    onPressCreate: jest.fn(),
  };

  // Helper function to render component with navigation context
  const renderWithNavigation = (component: React.ReactElement) => {
    const Stack = createNativeStackNavigator();
    const TestComponent = () => component;
    return render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="FastOnboarding" component={TestComponent} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.params = {};
    mockNavigation.setParams.mockImplementation((nextParams) => {
      mockRoute.params = {
        ...mockRoute.params,
        ...nextParams,
      };
    });
  });

  it('renders without crashing', () => {
    // Arrange & Act & Assert
    expect(() => {
      renderWithNavigation(<FastOnboarding {...mockProps} />);
    }).not.toThrow();
  });

  it('does not call any handler when onboardingType is undefined', () => {
    // Arrange
    mockRoute.params = { onboardingType: undefined };

    // Act
    renderWithNavigation(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockProps.onPressContinueWithGoogle).not.toHaveBeenCalled();
    expect(mockProps.onPressContinueWithApple).not.toHaveBeenCalled();
    expect(mockProps.onPressImport).not.toHaveBeenCalled();
    expect(mockNavigation.setParams).not.toHaveBeenCalled();
  });

  it('does not call any handler when params are empty', () => {
    // Arrange
    mockRoute.params = {};

    // Act
    renderWithNavigation(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockProps.onPressContinueWithGoogle).not.toHaveBeenCalled();
    expect(mockProps.onPressContinueWithApple).not.toHaveBeenCalled();
    expect(mockProps.onPressImport).not.toHaveBeenCalled();
    expect(mockNavigation.setParams).not.toHaveBeenCalled();
  });

  it('does not call any handler for unknown onboardingType', () => {
    // Arrange
    mockRoute.params = { onboardingType: 'unknown_type' };

    // Act
    renderWithNavigation(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockProps.onPressContinueWithGoogle).not.toHaveBeenCalled();
    expect(mockProps.onPressContinueWithApple).not.toHaveBeenCalled();
    expect(mockProps.onPressImport).not.toHaveBeenCalled();
  });

  describe('handleOnboardingDeeplink function', () => {
    it.each(['google', 'apple'] as const)(
      'handles %s onboarding type correctly with existingUser false',
      (onboardingType) => {
        // Arrange
        mockRoute.params = { onboardingType, existing: 'false' };
        const expectedHandlerMap = {
          google: mockProps.onPressContinueWithGoogle,
          apple: mockProps.onPressContinueWithApple,
        };

        // Act
        renderWithNavigation(<FastOnboarding {...mockProps} />);

        // Assert
        expect(expectedHandlerMap[onboardingType]).toHaveBeenCalledWith(true); // createWallet = !existing = true
        expect(expectedHandlerMap[onboardingType]).toHaveBeenCalledTimes(1);
      },
    );

    it.each(['google', 'apple'] as const)(
      'handles %s onboarding type correctly with existing true',
      (onboardingType) => {
        // Arrange
        mockRoute.params = { onboardingType, existing: 'true' };
        const expectedHandlerMap = {
          google: mockProps.onPressContinueWithGoogle,
          apple: mockProps.onPressContinueWithApple,
        };

        // Act
        renderWithNavigation(<FastOnboarding {...mockProps} />);

        // Assert
        expect(expectedHandlerMap[onboardingType]).toHaveBeenCalledWith(false); // createWallet = !existing= false
        expect(expectedHandlerMap[onboardingType]).toHaveBeenCalledTimes(1);
      },
    );

    it('handles srp onboarding type with existing true (calls onPressImport)', () => {
      // Arrange
      mockRoute.params = { onboardingType: 'srp', existing: 'true' };

      // Act
      renderWithNavigation(<FastOnboarding {...mockProps} />);

      // Assert
      expect(mockProps.onPressImport).toHaveBeenCalledTimes(1);
      expect(mockProps.onPressCreate).not.toHaveBeenCalled();
      expect(mockProps.onPressContinueWithGoogle).not.toHaveBeenCalled();
      expect(mockProps.onPressContinueWithApple).not.toHaveBeenCalled();
    });

    it('handles srp onboarding type with existing false (calls onPressCreate)', () => {
      // Arrange
      mockRoute.params = { onboardingType: 'srp', existing: 'false' };

      // Act
      renderWithNavigation(<FastOnboarding {...mockProps} />);

      // Assert
      expect(mockProps.onPressCreate).toHaveBeenCalledTimes(1);
      expect(mockProps.onPressImport).not.toHaveBeenCalled();
      expect(mockProps.onPressContinueWithGoogle).not.toHaveBeenCalled();
      expect(mockProps.onPressContinueWithApple).not.toHaveBeenCalled();
    });

    it('handles srp onboarding type with existingUser undefined (calls onPressCreate)', () => {
      // Arrange
      mockRoute.params = { onboardingType: 'srp' }; // existing undefined

      // Act
      renderWithNavigation(<FastOnboarding {...mockProps} />);

      // Assert
      expect(mockProps.onPressCreate).toHaveBeenCalledTimes(1);
      expect(mockProps.onPressImport).not.toHaveBeenCalled();
      expect(mockProps.onPressContinueWithGoogle).not.toHaveBeenCalled();
      expect(mockProps.onPressContinueWithApple).not.toHaveBeenCalled();
    });
  });

  it('clears deeplink params after starting social login', () => {
    // Arrange
    mockRoute.params = { onboardingType: 'google', existing: 'false' };

    // Act
    render(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      onboardingType: undefined,
      existing: undefined,
    });
  });

  it('does not start social login again when remounted after deeplink params are cleared', () => {
    // Arrange
    mockRoute.params = { onboardingType: 'google', existing: 'false' };

    // Act
    const { unmount } = render(<FastOnboarding {...mockProps} />);
    unmount();
    render(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockProps.onPressContinueWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('does not start social login again when handlers change while deeplink params remain', () => {
    // Arrange
    mockRoute.params = { onboardingType: 'apple', existing: 'false' };
    mockNavigation.setParams.mockImplementation(() => undefined);
    const firstAppleHandler = jest.fn();
    const secondAppleHandler = jest.fn();

    // Act
    const { rerender } = render(
      <FastOnboarding
        {...mockProps}
        onPressContinueWithApple={firstAppleHandler}
      />,
    );
    rerender(
      <FastOnboarding
        {...mockProps}
        onPressContinueWithApple={secondAppleHandler}
      />,
    );

    // Assert
    expect(firstAppleHandler).toHaveBeenCalledTimes(1);
    expect(secondAppleHandler).not.toHaveBeenCalled();
  });

  it('starts social login when the same deeplink arrives again after params are cleared', () => {
    // Arrange
    mockRoute.params = { onboardingType: 'google', existing: 'false' };
    const { rerender } = render(<FastOnboarding {...mockProps} />);
    rerender(<FastOnboarding {...mockProps} />);
    mockRoute.params = { onboardingType: 'google', existing: 'false' };

    // Act
    rerender(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockProps.onPressContinueWithGoogle).toHaveBeenCalledTimes(2);
    expect(mockProps.onPressContinueWithGoogle).toHaveBeenNthCalledWith(
      1,
      true,
    );
    expect(mockProps.onPressContinueWithGoogle).toHaveBeenNthCalledWith(
      2,
      true,
    );
  });
});
