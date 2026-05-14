// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import SegmentedProgressBar from './SegmentedProgressBar';

describe('SegmentedProgressBar', () => {
  it('renders the outer track with the provided testID', () => {
    const { getByTestId } = render(
      <SegmentedProgressBar current={1} total={3} testID="progress" />,
    );
    expect(getByTestId('progress')).toBeOnTheScreen();
  });

  it('renders the correct number of segment children for a given total', () => {
    const total = 4;
    const { getByTestId } = render(
      <SegmentedProgressBar current={1} total={total} testID="progress" />,
    );
    expect(getByTestId('progress').children).toHaveLength(total);
  });
});
