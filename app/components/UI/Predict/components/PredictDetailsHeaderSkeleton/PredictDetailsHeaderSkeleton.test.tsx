import React from 'react';
import { render } from '@testing-library/react-native';
import PredictDetailsHeaderSkeleton from './PredictDetailsHeaderSkeleton';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

describe('PredictDetailsHeaderSkeleton', () => {
  it('renders header skeleton with all elements', () => {
    const { getByTestId } = render(<PredictDetailsHeaderSkeleton />);

    expect(
      getByTestId('predict-details-header-skeleton-back-button'),
    ).toBeTruthy();
    expect(getByTestId('predict-details-header-skeleton-title')).toBeTruthy();
    expect(getByTestId('predict-details-header-skeleton-share')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    const customTestId = 'custom-header-skeleton';
    const { getByTestId } = render(
      <PredictDetailsHeaderSkeleton testID={customTestId} />,
    );

    expect(getByTestId(`${customTestId}-back-button`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-title`)).toBeTruthy();
    expect(getByTestId(`${customTestId}-share`)).toBeTruthy();
  });

  it('matches snapshot', () => {
    const tree = render(<PredictDetailsHeaderSkeleton />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
