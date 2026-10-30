import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import type { PerformanceCell } from '../utils/overlayMyProfileLiveStats';
import MyProfilePerformanceStats from './MyProfilePerformanceStats';

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

  it('renders a tappable uncounted note under the P&L value', () => {
    const onUncountedPress = jest.fn();

    renderWithProvider(
      <MyProfilePerformanceStats
        cells={allCells}
        uncountedCount={2}
        onUncountedPress={onUncountedPress}
      />,
    );

    expect(
      screen.getByText('2 positions not counted in P&L'),
    ).toBeOnTheScreen();
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
