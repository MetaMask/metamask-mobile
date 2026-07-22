import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PerpsMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';

/**
 * Transient UI state for the Perps Lite ⇄ Pro mode-switch "flash" overlay
 * (TAT-3551).
 *
 * When a user toggles Lite/Pro from any entry point, `mode` is set to the
 * destination mode which causes {@link PerpsModeFlashContainer} to briefly
 * flash the mode name on top of the current Perps screen. The container clears
 * it again once the flash has been shown. This state is intentionally NOT
 * persisted (see `persistConfig` blacklist) so a stale flash never replays on
 * app launch.
 */
export interface PerpsModeFlashState {
  /** Destination mode to flash, or `null` when nothing is being shown. */
  mode: PerpsMode | null;
}

export const initialState: PerpsModeFlashState = {
  mode: null,
};

const name = 'perpsModeFlash';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    showPerpsModeFlash: (state, action: PayloadAction<PerpsMode>) => {
      state.mode = action.payload;
    },
    hidePerpsModeFlash: (state) => {
      state.mode = null;
    },
  },
});

const { actions, reducer } = slice;

export const { showPerpsModeFlash, hidePerpsModeFlash } = actions;

export const selectPerpsModeFlashMode = (state: RootState): PerpsMode | null =>
  state.perpsModeFlash.mode;

export default reducer;
