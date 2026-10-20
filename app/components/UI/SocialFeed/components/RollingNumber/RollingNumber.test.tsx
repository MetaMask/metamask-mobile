import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import RollingNumber, { getRollingGlyphs } from './RollingNumber';

const TEST_ID = 'rolling-number';

describe('getRollingGlyphs', () => {
  it('keys glyphs by their distance from the right edge', () => {
    expect(getRollingGlyphs('$9.9')).toStrictEqual([
      { slotKey: 'slot-3', character: '$' },
      { slotKey: 'slot-2', character: '9' },
      { slotKey: 'slot-1', character: '.' },
      { slotKey: 'slot-0', character: '9' },
    ]);
  });

  it('keeps the trailing slots aligned when the value grows', () => {
    const before = getRollingGlyphs('$9.99');
    const after = getRollingGlyphs('$10.01');

    expect(after.slice(-3).map((glyph) => glyph.slotKey)).toStrictEqual(
      before.slice(-3).map((glyph) => glyph.slotKey),
    );
  });
});

describe('RollingNumber', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the value as one accessible label', () => {
    render(<RollingNumber value="$1,234.56" testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveProp(
      'accessibilityLabel',
      '$1,234.56',
    );
    expect(screen.getAllByText('1')).toHaveLength(1);
  });

  it('shows the new value after a change', () => {
    const { rerender } = render(
      <RollingNumber value="$100.00" testID={TEST_ID} />,
    );

    rerender(<RollingNumber value="$101.00" trend="up" testID={TEST_ID} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByLabelText('$101.00')).toBeOnTheScreen();
  });

  it('animates the first value change after mounting', () => {
    const { rerender } = render(
      <RollingNumber value="$200.00" testID={TEST_ID} />,
    );

    rerender(<RollingNumber value="$201.00" trend="up" testID={TEST_ID} />);

    expect(screen.getByText('1')).toHaveProp('entering', expect.anything());
    expect(screen.getByText('1')).toHaveProp('exiting', expect.anything());
  });

  it('keeps the resting color during a change', () => {
    const { rerender } = render(
      <RollingNumber
        value="$100.00"
        twClassName="text-alternative"
        reduceMotion
        testID={TEST_ID}
      />,
    );

    rerender(
      <RollingNumber
        value="$99.00"
        trend="down"
        twClassName="text-alternative"
        reduceMotion
        testID={TEST_ID}
      />,
    );

    expect(screen.getAllByText('9')[0]).toHaveStyle({
      color: lightTheme.colors.text.alternative,
    });
  });

  it('switches roll direction before applying a value that reverses it', () => {
    const { rerender } = render(
      <RollingNumber value="$100.00" trend="up" testID={TEST_ID} />,
    );

    rerender(<RollingNumber value="$98.00" trend="down" testID={TEST_ID} />);

    expect(screen.getByLabelText('$98.00')).toBeOnTheScreen();
  });
});
