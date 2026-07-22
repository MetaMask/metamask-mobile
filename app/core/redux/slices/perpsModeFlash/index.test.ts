import { PerpsMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import reducer, {
  hidePerpsModeFlash,
  initialState,
  selectPerpsModeFlashMode,
  showPerpsModeFlash,
} from './index';

describe('perpsModeFlash slice', () => {
  it('returns the initial state with no mode', () => {
    // Act
    const state = reducer(undefined, { type: '@@INIT' });

    // Assert
    expect(state).toEqual(initialState);
    expect(state.mode).toBeNull();
  });

  it('sets the mode when showing the flash', () => {
    // Act
    const state = reducer(initialState, showPerpsModeFlash(PerpsMode.Pro));

    // Assert
    expect(state.mode).toBe(PerpsMode.Pro);
  });

  it('clears the mode when hiding the flash', () => {
    // Arrange
    const shown = reducer(initialState, showPerpsModeFlash(PerpsMode.Lite));

    // Act
    const state = reducer(shown, hidePerpsModeFlash());

    // Assert
    expect(state.mode).toBeNull();
  });

  it('selects the current flash mode from state', () => {
    // Arrange
    const state = {
      perpsModeFlash: { mode: PerpsMode.Pro },
    } as unknown as RootState;

    // Act & Assert
    expect(selectPerpsModeFlashMode(state)).toBe(PerpsMode.Pro);
  });
});
