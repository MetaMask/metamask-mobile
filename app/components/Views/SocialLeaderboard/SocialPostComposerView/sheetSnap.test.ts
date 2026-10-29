import {
  didPassSheetMidpoint,
  gifDefaultHeight,
  resolveSheetSnap,
  sheetDragDirection,
  SHEET_FLING_VELOCITY,
  tallSheetHeight,
} from './sheetSnap';

describe('gifDefaultHeight', () => {
  it('uses 42 percent of the window when that is above 280', () => {
    expect(gifDefaultHeight(1000)).toBe(420);
  });

  it('uses 280 when 42 percent of the window is smaller', () => {
    expect(gifDefaultHeight(400)).toBe(280);
  });
});

describe('tallSheetHeight', () => {
  it('uses 90 percent of the window when that is below the safe-area cap', () => {
    expect(tallSheetHeight(1000, 40, 20)).toBe(880);
  });

  it('uses the safe-area cap when 90 percent is taller', () => {
    expect(tallSheetHeight(1000, 200, 20)).toBe(780);
  });
});

describe('sheetDragDirection', () => {
  it('treats a fast upward velocity as a fling even when the finger traveled down', () => {
    expect(sheetDragDirection(40, -SHEET_FLING_VELOCITY)).toEqual({
      direction: 'up',
      isFling: true,
    });
  });

  it('uses finger travel when the velocity stays under the fling speed', () => {
    expect(sheetDragDirection(-24, 100)).toEqual({
      direction: 'up',
      isFling: false,
    });
  });
});

describe('didPassSheetMidpoint', () => {
  it('passes once an upward drag covers half the gap to the tall height', () => {
    expect(
      didPassSheetMidpoint({
        stop: 'default',
        direction: 'up',
        translationY: -151,
        defaultHeight: 400,
        tallHeight: 700,
      }),
    ).toBe(true);
    expect(
      didPassSheetMidpoint({
        stop: 'default',
        direction: 'up',
        translationY: -149,
        defaultHeight: 400,
        tallHeight: 700,
      }),
    ).toBe(false);
  });

  it('passes once a downward drag from tall covers half the gap to the default', () => {
    expect(
      didPassSheetMidpoint({
        stop: 'tall',
        direction: 'down',
        translationY: 151,
        defaultHeight: 400,
        tallHeight: 700,
      }),
    ).toBe(true);
  });

  it('passes once a downward drag from the default covers half the sheet', () => {
    expect(
      didPassSheetMidpoint({
        stop: 'default',
        direction: 'down',
        translationY: 201,
        defaultHeight: 400,
        tallHeight: 700,
      }),
    ).toBe(true);
    expect(
      didPassSheetMidpoint({
        stop: 'default',
        direction: 'down',
        translationY: 199,
        defaultHeight: 400,
        tallHeight: 700,
      }),
    ).toBe(false);
  });
});

describe('resolveSheetSnap', () => {
  const base = {
    passedMidpoint: false,
    isFling: false,
    defaultIsTallCap: false,
  };

  it('moves the default stop to tall when an upward drag passes the midpoint', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'default',
        direction: 'up',
        passedMidpoint: true,
      }),
    ).toBe('tall');
  });

  it('stays at the default stop when an upward drag stops short', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'default',
        direction: 'up',
      }),
    ).toBe('default');
  });

  it('dismisses from the default stop on a downward fling', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'default',
        direction: 'down',
        isFling: true,
      }),
    ).toBe('dismiss');
  });

  it('stays at the default stop when a downward drag stops short', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'default',
        direction: 'down',
      }),
    ).toBe('default');
  });

  it('returns to the default stop when a downward drag from tall passes the midpoint', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'tall',
        direction: 'down',
        passedMidpoint: true,
      }),
    ).toBe('default');
  });

  it('stays tall when the drag continues upward', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'tall',
        direction: 'up',
        passedMidpoint: true,
        isFling: true,
      }),
    ).toBe('tall');
  });

  it('leaves a sheet that is already at the tall cap in place on an upward drag', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'default',
        direction: 'up',
        passedMidpoint: true,
        isFling: true,
        defaultIsTallCap: true,
      }),
    ).toBe('default');
  });

  it('dismisses a sheet that is already at the tall cap on a downward drag past the midpoint', () => {
    expect(
      resolveSheetSnap({
        ...base,
        stop: 'tall',
        direction: 'down',
        passedMidpoint: true,
        defaultIsTallCap: true,
      }),
    ).toBe('dismiss');
  });
});
