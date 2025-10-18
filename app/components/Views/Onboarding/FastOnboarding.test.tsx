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
    onPressCreate: jest.fn(),
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
});
