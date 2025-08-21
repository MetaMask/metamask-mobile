import React from 'react';
import { ScrollView } from 'react-native';
import { render } from '@testing-library/react-native';
import PerpsLoadingSkeleton from './PerpsLoadingSkeleton';

// Define proper types for the mock
interface SkeletonProps {
  testID?: string;
  width?: number;
  height?: number;
  style?: object;
}

// Mock the Skeleton component
jest.mock('../../../../../component-library/components/Skeleton', () => {
  // Import dependencies inside the mock factory
  const mockReact = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    Skeleton: ({ testID, width, height, style }: SkeletonProps) =>
      mockReact.createElement(RN.View, {
        testID,
        style: [{ width, height }, style],
      }),
  };
});

// Mock Device
jest.mock('../../../../../util/device', () => ({
  __esModule: true,
  default: {
    getDeviceWidth: jest.fn(() => 375),
  },
}));

describe('PerpsLoadingSkeleton', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(<PerpsLoadingSkeleton />);

    const skeleton = getByTestId('perps-loading-skeleton');
    expect(skeleton).toBeDefined();
  });

  it('should render with custom testID', () => {
    const customTestId = 'custom-skeleton';
    const { getByTestId } = render(
      <PerpsLoadingSkeleton testID={customTestId} />,
    );

    const skeleton = getByTestId(customTestId);
    expect(skeleton).toBeDefined();
  });

  it('should render control bar skeleton elements', () => {
    const { toJSON } = render(<PerpsLoadingSkeleton />);
    const tree = toJSON();

    // Verify the structure includes control bar elements
    expect(tree).toBeTruthy();

    // The skeleton should have the expected structure with proper styles
    // Check for control bar container with specific style properties
    const jsonString = JSON.stringify(tree);
    expect(jsonString).toContain('borderBottomWidth');
    expect(jsonString).toContain('paddingHorizontal');
    expect(jsonString).toContain('flexDirection');
    expect(jsonString).toContain('justifyContent');
  });

  it('should render position card skeletons', () => {
    const { toJSON } = render(<PerpsLoadingSkeleton />);
    const tree = toJSON();

    // Verify position cards are rendered with proper structure
    const jsonString = JSON.stringify(tree);
    // Check for position card specific styles
    expect(jsonString).toContain('borderRadius');
    expect(jsonString).toContain('padding');
    expect(jsonString).toContain('gap');
    expect(jsonString).toContain('alignItems');
  });

  it('should render scrollview with scrollEnabled false', () => {
    const { UNSAFE_getByType } = render(<PerpsLoadingSkeleton />);

    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.scrollEnabled).toBe(false);
  });

  it('should match snapshot', () => {
    const { toJSON } = render(<PerpsLoadingSkeleton />);
    expect(toJSON()).toMatchSnapshot();
  });
});
