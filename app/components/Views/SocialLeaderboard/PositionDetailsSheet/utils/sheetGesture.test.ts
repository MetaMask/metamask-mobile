import {
  getScrollViewportHeight,
  getSheetHeight,
  resolveChartAreaTouch,
  resolveSheetDrag,
  shouldDismissSheet,
} from './sheetGesture';

describe('getSheetHeight', () => {
  it('covers 90% of the window when that clears the status bar', () => {
    expect(getSheetHeight(800, 47)).toBe(720);
  });

  it('stops under the status bar when 90% would run past it', () => {
    expect(getSheetHeight(400, 60)).toBe(340);
  });

  it('never returns a negative height', () => {
    expect(getSheetHeight(0, 20)).toBe(0);
  });
});

describe('getScrollViewportHeight', () => {
  it('leaves the tab labels room above a pinned action', () => {
    const withFooter = getScrollViewportHeight(800, 0, 0, true);
    const withoutFooter = getScrollViewportHeight(800, 0, 0, false);

    expect(withFooter).toBe(567);
    expect(withoutFooter).toBeGreaterThan(withFooter);
  });
});

describe('resolveChartAreaTouch', () => {
  it('stays undecided before either axis has committed', () => {
    expect(resolveChartAreaTouch(4, 8, true)).toBe('pending');
  });

  it('scrubs a swipe with a sideways lean, including a diagonal', () => {
    expect(resolveChartAreaTouch(8, 4, true)).toBe('scrub');
    expect(resolveChartAreaTouch(20, 20, true)).toBe('scrub');
    expect(resolveChartAreaTouch(-12, 15, false)).toBe('scrub');
  });

  it('drags the sheet on a straight flick down at the top of the list', () => {
    expect(resolveChartAreaTouch(4, 16, true)).toBe('sheet');
    expect(resolveChartAreaTouch(8, 16, true)).toBe('sheet');
  });

  it('scrolls a straight swipe up, or down when the list is scrolled', () => {
    expect(resolveChartAreaTouch(2, -16, true)).toBe('scroll');
    expect(resolveChartAreaTouch(4, 20, false)).toBe('scroll');
  });
});

describe('resolveSheetDrag', () => {
  it('drags the sheet after 10pt down outside the chart', () => {
    expect(resolveSheetDrag(0, 10, false, true)).toBe('drag');
  });

  it('gives the gesture back after 10pt sideways or upward outside the chart', () => {
    expect(resolveSheetDrag(10, 2, false, true)).toBe('fail');
    expect(resolveSheetDrag(0, -10, false, true)).toBe('fail');
  });

  it('drags from the chart only on a straight downward swipe at the top', () => {
    expect(resolveSheetDrag(4, 16, true, true)).toBe('drag');
    expect(resolveSheetDrag(4, 16, true, false)).toBe('fail');
    expect(resolveSheetDrag(20, 12, true, true)).toBe('fail');
  });
});

describe('shouldDismissSheet', () => {
  const sheetHeight = 800;

  it.each([
    ['a flick down after a short drag', 20, 1200, true],
    ['a drag past a quarter of the sheet', 201, 0, true],
    ['a slow drag short of a quarter', 199, 0, false],
    ['an upward flick, however far it was dragged', 600, -1200, false],
    ['a release back at the top', 0, 2000, false],
  ])('%s', (_label, offset, velocityY, expected) => {
    expect(
      shouldDismissSheet({
        offset,
        velocityY,
        sheetHeight,
        canFlickDismiss: true,
      }),
    ).toBe(expected);
  });

  it('ignores a flick that began on a scrolled list unless dragged past a quarter', () => {
    const release = { velocityY: 1500, sheetHeight, canFlickDismiss: false };

    expect(shouldDismissSheet({ ...release, offset: 40 })).toBe(false);
    expect(shouldDismissSheet({ ...release, offset: 240 })).toBe(true);
  });
});
