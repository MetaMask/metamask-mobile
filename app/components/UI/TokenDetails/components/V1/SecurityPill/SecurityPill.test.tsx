import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import SecurityPill, { type SecurityVerdict } from './SecurityPill';
import { SecurityPillSelectors } from './SecurityPill.testIds';

const backgroundOf = (node: { props: { style?: unknown } }) =>
  (
    StyleSheet.flatten(node.props.style as never) as {
      backgroundColor?: string;
    }
  )?.backgroundColor;

describe('SecurityPill', () => {
  // The exact wording is contractual: ASSETS-4018 forbids "Pass",
  // "Fully screened", "No risk", "Partial screen", "Low risk", "Medium risk",
  // and never "Verified" on a memecoin.
  it.each([
    ['screened', 'Screened'],
    ['high_risk', 'High risk'],
    ['unscreened', 'Unscreened'],
    ['pending', 'Pending'],
  ] as [SecurityVerdict, string][])(
    'renders "%s" as the single word "%s"',
    (verdict, label) => {
      const { getByTestId, getByText } = render(
        <SecurityPill verdict={verdict} />,
      );

      expect(getByTestId(SecurityPillSelectors.VERDICT)).toBeOnTheScreen();
      expect(getByText(label)).toBeOnTheScreen();
    },
  );

  it.each([
    [1, '1 flag'],
    [3, '3 flags'],
  ])('renders medium_risk as the flag count: %i -> "%s"', (count, label) => {
    const { getByText } = render(
      <SecurityPill verdict="medium_risk" flagCount={count} />,
    );

    expect(getByText(label)).toBeOnTheScreen();
  });

  it('gives medium_risk its own background, distinct from the other verdicts', () => {
    const backgrounds = (
      ['medium_risk', 'screened', 'high_risk', 'pending'] as SecurityVerdict[]
    ).map((verdict) =>
      backgroundOf(
        render(<SecurityPill verdict={verdict} flagCount={1} />).getByTestId(
          SecurityPillSelectors.VERDICT,
        ),
      ),
    );

    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  it('ignores the flag count for verdicts with fixed labels', () => {
    const { getByText } = render(
      <SecurityPill verdict="screened" flagCount={7} />,
    );

    expect(getByText('Screened')).toBeOnTheScreen();
  });

  it('renders pending and unscreened as the only two neutral states', () => {
    const pending = render(<SecurityPill verdict="pending" />);
    const unscreened = render(<SecurityPill verdict="unscreened" />);
    const screened = render(<SecurityPill verdict="screened" />);
    const highRisk = render(<SecurityPill verdict="high_risk" />);

    const neutral = backgroundOf(
      pending.getByTestId(SecurityPillSelectors.VERDICT),
    );

    expect(
      backgroundOf(unscreened.getByTestId(SecurityPillSelectors.VERDICT)),
    ).toBe(neutral);
    expect(
      backgroundOf(screened.getByTestId(SecurityPillSelectors.VERDICT)),
    ).not.toBe(neutral);
    expect(
      backgroundOf(highRisk.getByTestId(SecurityPillSelectors.VERDICT)),
    ).not.toBe(neutral);
  });

  it('renders a button that announces the verdict and its destination when pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SecurityPill verdict="high_risk" onPress={onPress} />,
    );

    const pill = getByTestId(SecurityPillSelectors.PILL);

    expect(pill.props.accessibilityRole).toBe('button');
    expect(pill.props.accessibilityLabel).toBe(
      'Security: High risk. Open Security tab',
    );

    fireEvent.press(pill);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders static text with no button when no press handler is supplied', () => {
    const { queryByTestId, getByText } = render(
      <SecurityPill verdict="screened" />,
    );

    expect(queryByTestId(SecurityPillSelectors.PILL)).toBeNull();
    expect(getByText('Screened')).toBeOnTheScreen();
  });
});
