import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PredictDetailsHeaderSkeleton from './PredictDetailsHeaderSkeleton';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const renderWithNavigation = (component: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>{component}</NavigationContainer>
    </SafeAreaProvider>,
  );

describe('PredictDetailsHeaderSkeleton', () => {
  it('renders header skeleton with all elements', () => {
    const { getByTestId } = renderWithNavigation(
      <PredictDetailsHeaderSkeleton />,
    );

    expect(
      getByTestId('predict-details-header-skeleton-back-button'),
    ).toBeTruthy();
    expect(getByTestId('predict-details-header-skeleton-avatar')).toBeTruthy();
    expect(getByTestId('predict-details-header-skeleton-title')).toBeTruthy();
    expect(
      getByTestId('predict-details-header-skeleton-subtitle'),
    ).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-header-skeleton';
    const { getByTestId } = renderWithNavigation(
      <PredictDetailsHeaderSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-back-button`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-avatar`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-title`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-subtitle`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = renderWithNavigation(
      <PredictDetailsHeaderSkeleton />,
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
