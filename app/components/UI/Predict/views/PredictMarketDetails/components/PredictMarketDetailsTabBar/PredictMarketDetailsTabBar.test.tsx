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
    const { getAllByText } = render(
      <PredictMarketDetailsTabBar
        tabs={threeTabs}
        activeTab={0}
        onTabPress={mockOnTabPress}
      />,
    );

    // Tab renders a hidden + visible label copy for layout; allow duplicates per label.
    expect(getAllByText('Positions').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Outcomes').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('About').length).toBeGreaterThanOrEqual(1);
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
    const { getByTestId } = render(
      <PredictMarketDetailsTabBar
        tabs={twoTabs}
        activeTab={0}
        onTabPress={mockOnTabPress}
      />,
    );

    fireEvent.press(
      getByTestId(getPredictMarketDetailsSelector.tabBarTab('outcomes')),
    );

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
});
