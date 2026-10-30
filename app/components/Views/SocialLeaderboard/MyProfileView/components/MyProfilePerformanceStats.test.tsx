import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type { PerformanceCell } from '../utils/overlayMyProfileLiveStats';
import MyProfilePerformanceStats from './MyProfilePerformanceStats';

interface StyledNode {
  props: { style?: unknown };
  parent: StyledNode | null;
}

const ancestorWithStyle = (
  node: StyledNode,
  matches: (style: Record<string, unknown>) => boolean,
): StyledNode | null => {
  let current: StyledNode | null = node;
  while (current) {
    const style = StyleSheet.flatten(current.props.style) as
      | Record<string, unknown>
      | undefined;
    if (style && matches(style)) {
      return current;
    }
    current = current.parent;
  }
  return null;
};

const allCells: PerformanceCell[] = [
  { id: 'pnl', value: '+$1,200', tone: 'success' },
  { id: 'winRate', value: '42%', tone: 'default' },
  { id: 'holdTime', value: '3h', tone: 'default' },
  { id: 'volume', value: '$50,000', tone: 'default' },
];

describe('MyProfilePerformanceStats', () => {
  it('renders the section header and every provided cell', () => {
    renderWithProvider(<MyProfilePerformanceStats cells={allCells} />);

    expect(screen.getByText('Performance (30d)')).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL),
    ).toHaveTextContent('+$1,200');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_WIN_RATE),
    ).toHaveTextContent('42%');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_HOLD_TIME),
    ).toHaveTextContent('3h');
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_VOLUME),
    ).toHaveTextContent('$50,000');
  });

  it('renders only the cells it receives', () => {
    renderWithProvider(
      <MyProfilePerformanceStats cells={[allCells[1], allCells[3]]} />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_WIN_RATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_VOLUME),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_HOLD_TIME),
    ).not.toBeOnTheScreen();
  });

  it('hides the uncounted note when no positions are flagged', () => {
    renderWithProvider(
      <MyProfilePerformanceStats cells={allCells} uncountedCount={0} />,
    );

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL_UNCOUNTED),
    ).toBeNull();
  });

  it('renders a tappable uncounted note under the performance title', () => {
    const onUncountedPress = jest.fn();

    renderWithProvider(
      <MyProfilePerformanceStats
        cells={allCells}
        uncountedCount={2}
        onUncountedPress={onUncountedPress}
      />,
    );

    const noteText = screen.getByText('2 positions not counted in P&L');
    expect(noteText).toBeOnTheScreen();
    expect(noteText.props.numberOfLines).toBeUndefined();
    expect(screen.getByText('P&L')).toBeOnTheScreen();

    const note = screen.getByRole('button', {
      name: '2 positions not counted in P&L',
    });
    expect(note).toBeOnTheScreen();
    expect(note.props.accessibilityHint).toBe(
      'Scrolls to positions not counted',
    );
    expect(note.props.hitSlop).toEqual({
      top: 11,
      bottom: 11,
      left: 0,
      right: 0,
    });
    expect(StyleSheet.flatten(note.props.style)).toEqual(
      expect.objectContaining({ alignSelf: 'flex-start' }),
    );

    const title = screen.getByText('Performance (30d)');
    expect(StyleSheet.flatten(title.props.style)).toEqual(
      expect.objectContaining({ fontSize: 20, lineHeight: 24 }),
    );
    const header = ancestorWithStyle(
      title,
      (style) => style.gap === 4 && style.paddingTop === 12,
    );
    expect(header).toBeTruthy();
    expect(StyleSheet.flatten(header?.props.style)).toEqual(
      expect.objectContaining({
        flexDirection: 'column',
        gap: 4,
        paddingTop: 12,
        paddingLeft: 16,
        paddingRight: 16,
      }),
    );
    expect(ancestorWithStyle(note, (style) => style.gap === 4)).toBe(header);

    const underline = ancestorWithStyle(
      noteText,
      (style) => style.alignSelf === 'flex-start',
    );
    expect(underline).toBeTruthy();

    const statsGrid = ancestorWithStyle(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL),
      (style) => style.paddingTop === 12 && style.paddingBottom === 12,
    );
    expect(statsGrid).toBeTruthy();
    expect(statsGrid).not.toContainElement(note);
    expect(StyleSheet.flatten(statsGrid?.props.style)).toEqual(
      expect.objectContaining({
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
      }),
    );

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_PNL_UNCOUNTED),
    );

    expect(onUncountedPress).toHaveBeenCalledTimes(1);
  });

  it('uses a singular uncounted note for one position', () => {
    renderWithProvider(
      <MyProfilePerformanceStats cells={allCells} uncountedCount={1} />,
    );

    expect(screen.getByText('1 position not counted in P&L')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: '1 position not counted in P&L',
      }),
    ).toBeOnTheScreen();
  });

  it('renders nothing when there are no cells', () => {
    renderWithProvider(<MyProfilePerformanceStats cells={[]} />);

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERFORMANCE_SECTION),
    ).not.toBeOnTheScreen();
  });
});
