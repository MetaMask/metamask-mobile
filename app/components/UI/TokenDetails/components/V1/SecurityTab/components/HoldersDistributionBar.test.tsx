import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import HoldersDistributionBar from './HoldersDistributionBar';

const widthOf = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) as { width?: string })?.width;

const renderBar = (
  props: Partial<React.ComponentProps<typeof HoldersDistributionBar>> = {},
) => render(<HoldersDistributionBar topTenPercentage={18.4} {...props} />);

describe('HoldersDistributionBar', () => {
  it.each([
    [18.4, '18.4%'],
    [0, '0%'],
    [100, '100%'],
  ])('sizes the fill to a top-ten share of %p', (share, expected) => {
    const { getByTestId } = renderBar({ topTenPercentage: share });

    expect(
      widthOf(getByTestId(SecurityTabSelectors.DISTRIBUTION_BAR_FILL)),
    ).toBe(expected);
  });

  // A zero-width bar reads as "0% concentration", which is a reassuring claim
  // the data does not support. Absent data has to render nothing at all.
  it('renders nothing when the share is unknown', () => {
    const { queryByTestId } = renderBar({ topTenPercentage: null });

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

  // Both figures come from the one number the fill is sized from, so a bar
  // whose length contradicts its legend cannot be constructed. This used to
  // take three props that nothing kept in agreement.
  it.each([
    [18.4, 'Top 10 18.4%', 'Remaining holders 81.6%'],
    [100, 'Top 10 100.0%', 'Remaining holders 0.0%'],
    [0, 'Top 10 0.0%', 'Remaining holders 100.0%'],
  ])('derives both legend figures from %p', (share, topTen, remaining) => {
    const { getByTestId } = renderBar({ topTenPercentage: share });

    expect(getByTestId(SecurityTabSelectors.LEGEND_TOP_TEN)).toHaveTextContent(
      topTen,
    );
    expect(
      getByTestId(SecurityTabSelectors.LEGEND_REMAINING),
    ).toHaveTextContent(remaining);
  });
});
