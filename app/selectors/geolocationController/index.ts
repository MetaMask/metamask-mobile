import type { RootState } from '../../reducers';

export const selectGeolocationControllerState = (state: RootState) =>
  state.engine?.backgroundState?.GeolocationController;

export const selectGeolocationLocation = (state: RootState) =>
  state.engine?.backgroundState?.GeolocationController?.location;
