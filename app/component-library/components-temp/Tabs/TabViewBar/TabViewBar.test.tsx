// Third party dependencies.
import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import TabViewBar, { TabViewBarProps, TabViewRoute } from './TabViewBar';

const routes: TabViewRoute[] = [
  { key: 'one', title: 'One' },
  { key: 'two', title: 'Two' },
  { key: 'three', title: 'Three' },
];

const renderBar = (overrides: Partial<TabViewBarProps> = {}) => {
  const jumpTo = jest.fn();
  const utils = render(
    <TabViewBar
      layout={{ width: 300, height: 600 }}
      position={
        new Animated.Value(
          0,
        ) as unknown as Animated.AnimatedInterpolation<number>
      }
      jumpTo={jumpTo}
      navigationState={{ index: 0, routes }}
      testID="tabs"
      {...overrides}
    />,
  );
  return { ...utils, jumpTo };
};

describe('TabViewBar', () => {
  it('renders every tab label', () => {
    const { getAllByText } = renderBar();

    routes.forEach((route) => {
      expect(getAllByText(route.title).length).toBeGreaterThan(0);
    });
  });

  it('uses the indexed test ID convention for tabs and labels', () => {
    const { getByTestId } = renderBar();

    expect(getByTestId('tabs-tab-0')).toBeOnTheScreen();
    expect(getByTestId('tabs-tab-0-label')).toBeOnTheScreen();
    expect(getByTestId('tabs-tab-1-label')).toBeOnTheScreen();
  });

  it('jumps to the pressed tab and reports its index', () => {
    const onTabPress = jest.fn();
    const { getByTestId, jumpTo } = renderBar({ onTabPress });

    fireEvent.press(getByTestId('tabs-tab-1'));

    expect(onTabPress).toHaveBeenCalledWith(1);
    expect(jumpTo).toHaveBeenCalledWith('two');
  });

  it('renders tabs inside a horizontal scroll list so overflow can scroll', () => {
    const manyRoutes: TabViewRoute[] = Array.from({ length: 10 }, (_, i) => ({
      key: `tab${i}`,
      title: `Long tab label ${i}`,
    }));
    const { getByTestId, UNSAFE_getAllByProps } = renderBar({
      navigationState: { index: 0, routes: manyRoutes },
    });

    expect(getByTestId('tabs-tab-9')).toBeOnTheScreen();
    expect(UNSAFE_getAllByProps({ horizontal: true }).length).toBeGreaterThan(
      0,
    );
  });
});
