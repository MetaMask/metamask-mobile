import React from 'react';
import MainNavigator from './MainNavigator';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';

jest.mock('../../UI/Drawer');
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

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<MainNavigator />,
        { state: initialRootState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('routes to SampleFeature', () => {
    const container = renderWithProvider(<MainNavigator />,
        { state: initialRootState },
    );

    interface Child {type: string, props: {name: string, component: { name: string }}}
    interface ScreenChild {name: string, component: { name: string }}
    // Get all Stack.Screen components
    const screenProps: ScreenChild[] = container.root.children.map((child: Child) => {
      if (child.type === 'Screen') {
        return {
          name: child.props.name,
          component: child.props.component,
        };
      }
      return undefined;
    });

    // Find the Sample Feature screen
    const sampleFeatureScreen = screenProps?.find(
        (screen) => screen?.name === Routes.SAMPLE_FEATURE
    );

    // Assert that the screen exists and has the correct component
    expect(sampleFeatureScreen).toBeDefined();
    expect(sampleFeatureScreen?.component.name).toBe('SampleFeatureFlow');
  });
});
