import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsHomeDeferredSkeleton, {
  PERPS_HOME_DEFERRED_SKELETON_TEST_IDS,
} from './PerpsHomeDeferredSkeleton';

// Mock Skeleton from MMDS
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactNative = jest.requireActual('react-native');
  return {
    ...actual,
    Skeleton: jest.fn(({ height, width, style, testID }) => (
      <ReactNative.View
        testID={testID || 'skeleton'}
        style={[{ height, width }, style]}
        accessibilityLabel={`skeleton-${height}x${width}`}
      />
    )),
  };
});

describe('PerpsHomeDeferredSkeleton', () => {
  it('renders the WhatsHappening and Explore skeleton sections', () => {
    const { getByTestId } = render(<PerpsHomeDeferredSkeleton />);

    expect(
      getByTestId(PERPS_HOME_DEFERRED_SKELETON_TEST_IDS.WHATS_HAPPENING),
    ).toBeTruthy();
    expect(
      getByTestId(PERPS_HOME_DEFERRED_SKELETON_TEST_IDS.EXPLORE),
    ).toBeTruthy();
  });

  it('renders section header bars for both sections', () => {
    const { getAllByLabelText } = render(<PerpsHomeDeferredSkeleton />);

    // Two title bars + two chevron circles.
    expect(getAllByLabelText('skeleton-28x200')).toHaveLength(1);
    expect(getAllByLabelText('skeleton-28x110')).toHaveLength(1);
    expect(getAllByLabelText('skeleton-24x24')).toHaveLength(2);
  });
});
