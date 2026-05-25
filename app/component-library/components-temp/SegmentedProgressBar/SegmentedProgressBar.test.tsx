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

  it('renders no segments when total is 0', () => {
    const { getByTestId } = render(
      <SegmentedProgressBar current={0} total={0} testID="progress" />,
    );
    expect(getByTestId('progress').children).toHaveLength(0);
  });

  it('renders all segments when current is 0', () => {
    const total = 3;
    const { getByTestId } = render(
      <SegmentedProgressBar current={0} total={total} testID="progress" />,
    );
    expect(getByTestId('progress').children).toHaveLength(total);
  });

  it('renders all segments when current equals total', () => {
    const total = 3;
    const { getByTestId } = render(
      <SegmentedProgressBar current={total} total={total} testID="progress" />,
    );
    expect(getByTestId('progress').children).toHaveLength(total);
  });

  it('renders without a testID when testID prop is omitted', () => {
    const { toJSON } = render(<SegmentedProgressBar current={1} total={2} />);
    expect(toJSON()).not.toBeNull();
  });
});
