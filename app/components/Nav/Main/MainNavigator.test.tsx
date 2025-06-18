import React from 'react';
import MainNavigator from './MainNavigator';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { ReactTestInstance } from 'react-test-renderer';

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn().mockReturnValue({
    Navigator: 'Navigator',
    Screen: 'Screen',
  }),
}));

describe('MainNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches rendered snapshot', () => {
    // Given the initial app state
    // When rendering the MainNavigator
    const { toJSON } = renderWithProvider(<MainNavigator />,
        { state: initialRootState },
    );
    
    // Then it should match the expected navigation structure
    expect(toJSON()).toMatchSnapshot();
  });

  it('includes SampleFeature screen in the navigation stack', () => {
    // Given the initial app state
    // When rendering the MainNavigator
    const container = renderWithProvider(<MainNavigator />,
        { state: initialRootState },
    );

    // Then it should contain the SampleFeature screen with correct configuration
    interface ScreenChild {name: string, component: { name: string }}
    const screenProps: ScreenChild[] = container.root.children
      .filter((child): child is ReactTestInstance => 
        typeof child === 'object' && 
        'type' in child && 
        'props' in child && 
        child.type?.toString() === 'Screen'
      )
      .map((child) => ({
        name: child.props.name,
        component: child.props.component,
      }));

    const sampleFeatureScreen = screenProps?.find(
        (screen) => screen?.name === Routes.SAMPLE_FEATURE
    );

    expect(sampleFeatureScreen).toBeDefined();
    expect(sampleFeatureScreen?.component.name).toBe('SampleFeatureFlow');
  });
});
