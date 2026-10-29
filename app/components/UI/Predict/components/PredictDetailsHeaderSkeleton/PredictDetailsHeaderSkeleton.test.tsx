import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictDetailsHeaderSkeleton from './PredictDetailsHeaderSkeleton';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/CapsuleGlass',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View testID="capsule">{children}</View>
      ),
    };
  },
);

describe('PredictDetailsHeaderSkeleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the back button without a glass capsule by default', () => {
    const { queryByTestId } = render(<PredictDetailsHeaderSkeleton />);

    expect(queryByTestId('capsule')).toBeNull();
  });

  it('renders the back button in a glass capsule when isGlass is set', () => {
    const { getByTestId } = render(<PredictDetailsHeaderSkeleton isGlass />);

    expect(getByTestId('capsule')).toBeOnTheScreen();
  });

  it('renders the title and share placeholders when isGlass is set', () => {
    const { getByTestId } = render(<PredictDetailsHeaderSkeleton isGlass />);

    expect(
      getByTestId('predict-details-header-skeleton-title'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('predict-details-header-skeleton-share'),
    ).toBeOnTheScreen();
  });

  it('navigates back when the glass back button is pressed', () => {
    const { getByTestId } = render(<PredictDetailsHeaderSkeleton isGlass />);

    fireEvent.press(getByTestId('predict-details-header-skeleton-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

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
});
