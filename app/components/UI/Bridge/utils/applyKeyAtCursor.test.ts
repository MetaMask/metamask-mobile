import { Keys } from '../../../Base/Keypad';
import { applyKeyAtCursor } from './applyKeyAtCursor';

describe('applyKeyAtCursor', () => {
  it('deletes at cursor position', () => {
    expect(
      applyKeyAtCursor({
        currentValue: '1234',
        pressedKey: Keys.Back,
        cursorPosition: 2,
        decimals: 18,
      }),
    ).toEqual({
      value: '134',
      cursorPosition: 1,
    });
  });

  it('inserts digits at cursor position', () => {
    expect(
      applyKeyAtCursor({
        currentValue: '1234',
        pressedKey: Keys.Digit9,
        cursorPosition: 2,
        decimals: 18,
      }),
    ).toEqual({
      value: '12934',
      cursorPosition: 3,
    });
  });

  it('inserts decimal at cursor position', () => {
    expect(
      applyKeyAtCursor({
        currentValue: '1234',
        pressedKey: Keys.Period,
        cursorPosition: 2,
        decimals: 18,
      }),
    ).toEqual({
      value: '12.34',
      cursorPosition: 3,
    });
  });

  it('does not insert more decimal places than allowed', () => {
    expect(
      applyKeyAtCursor({
        currentValue: '12.34',
        pressedKey: Keys.Digit5,
        cursorPosition: 5,
        decimals: 2,
      }),
    ).toEqual({
      value: '12.34',
      cursorPosition: 5,
    });
  });

  it('normalizes leading decimal insertion', () => {
    expect(
      applyKeyAtCursor({
        currentValue: '123',
        pressedKey: Keys.Period,
        cursorPosition: 0,
        decimals: 18,
      }),
    ).toEqual({
      value: '0.123',
      cursorPosition: 2,
    });
  });

  it('resets value for Initial key', () => {
    expect(
      applyKeyAtCursor({
        currentValue: '12.34',
        pressedKey: Keys.Initial,
        cursorPosition: 4,
        decimals: 18,
      }),
    ).toEqual({
      value: '0',
      cursorPosition: 0,
    });
  });
});
