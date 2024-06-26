import { RootState } from '../reducers';

export default function (state: RootState) {
  return state.settings.showFiatOnTestnets;
}
