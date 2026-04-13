import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictMarketDetailsTabBar, {
  type PredictMarketDetailsTabBarProps,
} from './PredictMarketDetailsTabBar';
import {
  PredictMarketDetailsSelectorsIDs,
  getPredictMarketDetailsSelector,
} from '../../../../Predict.testIds';

const twoTabs: PredictMarketDetailsTabBarProps['tabs'] = [
  { label: 'Positions', key: 'positions' },
  { label: 'Outcomes', key: 'outcomes' },
];

const threeTabs: PredictMarketDetailsTabBarProps['tabs'] = [
  { label: 'Positions', key: 'positions' },
  { label: 'Outcomes', key: 'outcomes' },
  { label: 'About', key: 'about' },
];

describe('PredictMarketDetailsTabBar', () => {
  const mockOnTabPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tab bar container', () => {
    const { getByTestId } = render(
      <PredictMarketDetailsTabBar
        tabs={twoTabs}
        activeTab={0}
        onTabPress={mockOnTabPress}
      />,
    );

    expect(
      getByTestId(PredictMarketDetailsSelectorsIDs.TAB_BAR),
    ).toBeOnTheScreen();
  });

  it('renders all tab labels', () => {
    const { getByText } = render(
      <PredictMarketDetailsTabBar
        tabs={threeTabs}
        activeTab={0}
        onTabPress={mockOnTabPress}
      />,
    );

    expect(getByText('Positions')).toBeOnTheScreen();
    expect(getByText('Outcomes')).toBeOnTheScreen();
    expect(getByText('About')).toBeOnTheScreen();
  });

  it('renders correct testID for each tab', () => {
    const { getByTestId } = render(
      <PredictMarketDetailsTabBar
        tabs={twoTabs}
        activeTab={0}
        onTabPress={mockOnTabPress}
      />,
    );

    expect(
      getByTestId(getPredictMarketDetailsSelector.tabBarTab('positions')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(getPredictMarketDetailsSelector.tabBarTab('outcomes')),
    ).toBeOnTheScreen();
  });

  it('calls onTabPress with correct index when tab is pressed', () => {
    const { getByText } = render(
      <PredictMarketDetailsTabBar
        tabs={twoTabs}
        activeTab={0}
        onTabPress={mockOnTabPress}
      />,
    );

    fireEvent.press(getByText('Outcomes'));

    expect(mockOnTabPress).toHaveBeenCalledWith(1);
  });

  it('renders nothing when tabs array is empty', () => {
    const { getByTestId, queryByText } = render(
      <PredictMarketDetailsTabBar
        tabs={[]}
        activeTab={null}
        onTabPress={mockOnTabPress}
      />,
    );

    expect(
      getByTestId(PredictMarketDetailsSelectorsIDs.TAB_BAR),
    ).toBeOnTheScreen();
    expect(queryByText('Positions')).not.toBeOnTheScreen();
  });

  describe('tabTwStyle prop', () => {
    it('produces different tab styles when tabTwStyle is provided', () => {
      const { getByTestId: getWithStyle } = render(
        <PredictMarketDetailsTabBar
          tabs={twoTabs}
          activeTab={0}
          onTabPress={mockOnTabPress}
          tabTwStyle="flex-1"
        />,
      );

      const { getByTestId: getWithoutStyle } = render(
        <PredictMarketDetailsTabBar
          tabs={twoTabs}
          activeTab={0}
          onTabPress={mockOnTabPress}
        />,
      );

      const tabWithStyle = getWithStyle(
        getPredictMarketDetailsSelector.tabBarTab('positions'),
      );
      const tabWithoutStyle = getWithoutStyle(
        getPredictMarketDetailsSelector.tabBarTab('positions'),
      );

      expect(tabWithStyle.props.style).not.toEqual(tabWithoutStyle.props.style);
    });
  });
});
