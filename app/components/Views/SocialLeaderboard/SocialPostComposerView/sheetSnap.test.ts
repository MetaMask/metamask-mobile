import { Platform } from 'react-native';
import {
  didPassSheetMidpoint,
  gifDefaultHeight,
  resolveSheetSnap,
  sheetBackdropHeight,
  sheetBottomPadding,
  sheetDragDirection,
  SHEET_FLING_VELOCITY,
  tallSheetHeight,
  type ResolveSheetSnapInput,
  type SheetMidpointInput,
} from './sheetSnap';

const snap = (overrides: Partial<ResolveSheetSnapInput>) =>
  resolveSheetSnap({
    stop: 'default',
    direction: 'up',
    passedMidpoint: false,
    isFling: false,
    defaultIsTallCap: false,
    ...overrides,
  });

const midpoint = (overrides: Partial<SheetMidpointInput>) =>
  didPassSheetMidpoint({
    stop: 'default',
    direction: 'up',
    translationY: 0,
    defaultHeight: 400,
    tallHeight: 700,
    ...overrides,
  });

describe('sheetSnap', () => {
  it('sizes the gif default and the tall cap', () => {
    expect(gifDefaultHeight(1000)).toBe(420);
    expect(gifDefaultHeight(400)).toBe(280);
    expect(tallSheetHeight(1000, 40, 20)).toBe(880);
    expect(tallSheetHeight(1000, 200, 20)).toBe(780);
    expect(sheetBottomPadding(20)).toBe(Platform.OS === 'android' ? 36 : 20);
    expect(sheetBackdropHeight(1000, 420, 20)).toBe(548);
    expect(sheetBackdropHeight(1000, 0, 20)).toBe(0);
  });

  it('uses a fast velocity as a fling and finger travel otherwise', () => {
    expect(sheetDragDirection(40, -SHEET_FLING_VELOCITY)).toEqual({
      direction: 'up',
      isFling: true,
    });
    expect(sheetDragDirection(-24, 100)).toEqual({
      direction: 'up',
      isFling: false,
    });
  });

  it('crosses the midpoint halfway through a resize or a dismiss', () => {
    expect(midpoint({ translationY: -151 })).toBe(true);
    expect(midpoint({ translationY: -149 })).toBe(false);
    expect(
      midpoint({ stop: 'tall', direction: 'down', translationY: 151 }),
    ).toBe(true);
    expect(midpoint({ direction: 'down', translationY: 201 })).toBe(true);
    expect(midpoint({ direction: 'down', translationY: 199 })).toBe(false);
  });

  it('snaps to tall, back to the default, or dismisses', () => {
    expect(snap({ direction: 'up', passedMidpoint: true })).toBe('tall');
    expect(snap({ direction: 'up' })).toBe('default');
    expect(snap({ direction: 'down', isFling: true })).toBe('dismiss');
    expect(snap({ direction: 'down' })).toBe('default');
    expect(
      snap({ stop: 'tall', direction: 'down', passedMidpoint: true }),
    ).toBe('default');
    expect(
      snap({
        stop: 'tall',
        direction: 'up',
        passedMidpoint: true,
        isFling: true,
      }),
    ).toBe('tall');
    expect(
      snap({
        direction: 'up',
        passedMidpoint: true,
        isFling: true,
        defaultIsTallCap: true,
      }),
    ).toBe('default');
    expect(
      snap({
        stop: 'tall',
        direction: 'down',
        passedMidpoint: true,
        defaultIsTallCap: true,
      }),
    ).toBe('dismiss');
  });
});
