import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { SECURITY_EMPTY_VALUE } from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import HoldersDistributionBar from './HoldersDistributionBar';

const widthOf = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) as { width?: string })?.width;

const renderBar = (
  props: Partial<React.ComponentProps<typeof HoldersDistributionBar>> = {},
) =>
  render(
    <HoldersDistributionBar
      fillPercentage={18.4}
      topTenPercentage="18.4%"
      remainingPercentage="81.6%"
      {...props}
    />,
  );

describe('HoldersDistributionBar', () => {
  it.each([
    [18.4, '18.4%'],
    [0, '0%'],
    [100, '100%'],
  ])('sizes the fill to a top-ten share of %p', (fill, expected) => {
    const { getByTestId } = renderBar({ fillPercentage: fill });

    expect(
      widthOf(getByTestId(SecurityTabSelectors.DISTRIBUTION_BAR_FILL)),
    ).toBe(expected);
  });

  // A zero-width bar reads as "0% concentration", which is a reassuring claim
  // the data does not support. Absent data has to render nothing at all.
  it('renders nothing when the share is unknown', () => {
    const { queryByTestId } = renderBar({ fillPercentage: null });

    expect(queryByTestId(SecurityTabSelectors.DISTRIBUTION_BAR)).toBeNull();
  });

  // Label and value live in one `Text` so they wrap as a unit — the bar alone
  // encodes the split only by length, which a screen reader cannot read.
  it('labels both halves of the split', () => {
    const { getByTestId } = renderBar();

    expect(getByTestId(SecurityTabSelectors.LEGEND_TOP_TEN)).toHaveTextContent(
      'Top 10 18.4%',
    );
    expect(
      getByTestId(SecurityTabSelectors.LEGEND_REMAINING),
    ).toHaveTextContent('Remaining holders 81.6%');
  });

  it('dashes a legend figure it was not given', () => {
    const { getByTestId } = renderBar({ remainingPercentage: null });

    expect(
      getByTestId(SecurityTabSelectors.LEGEND_REMAINING),
    ).toHaveTextContent(`Remaining holders ${SECURITY_EMPTY_VALUE}`);
  });
});
