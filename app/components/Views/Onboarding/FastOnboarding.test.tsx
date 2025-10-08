import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
  };

  // Helper function to render component with navigation context
  const renderWithNavigation = (component: React.ReactElement) => {
    const Stack = createStackNavigator();
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
    // setParams should still be called to clear the unknown type
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      onboardingType: undefined,
    });
  });

  it('clears onboardingType parameter when handling deeplink', () => {
    // Arrange
    const existingParams = { someOtherParam: 'value' };
    mockRoute.params = { ...existingParams, onboardingType: 'google' };

    // Act
    renderWithNavigation(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      ...existingParams,
      onboardingType: undefined,
    });
  });

  describe('handleOnboardingDeeplink function', () => {
    it.each(['google', 'apple', 'import_srp'] as const)(
      'handles %s onboarding type correctly',
      (onboardingType) => {
        // Arrange
        mockRoute.params = { onboardingType };
        const expectedHandlerMap = {
          google: mockProps.onPressContinueWithGoogle,
          apple: mockProps.onPressContinueWithApple,
          import_srp: mockProps.onPressImport,
        };

        // Act
        renderWithNavigation(<FastOnboarding {...mockProps} />);

        // Assert
        expect(expectedHandlerMap[onboardingType]).toHaveBeenCalledTimes(1);
      },
    );
  });

  it('preserves other route parameters when clearing onboardingType', () => {
    // Arrange
    const otherParams = {
      screen: 'SomeScreen',
      userId: '123',
      feature: 'test',
    };
    mockRoute.params = {
      ...otherParams,
      onboardingType: 'apple',
    };

    // Act
    renderWithNavigation(<FastOnboarding {...mockProps} />);

    // Assert
    expect(mockNavigation.setParams).toHaveBeenCalledWith({
      ...otherParams,
      onboardingType: undefined,
    });
    expect(mockProps.onPressContinueWithApple).toHaveBeenCalledTimes(1);
  });
});
