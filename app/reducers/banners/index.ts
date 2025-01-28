/* eslint-disable @typescript-eslint/default-param-last */
import { REHYDRATE } from 'redux-persist';
import { dismissBanner } from '../../actions/banners';

export interface BannersState {
  dismissedBanners: string[];
}

const initialState: BannersState = {
  dismissedBanners: [],
};

const bannersReducer = (
  state = initialState,
  action: {
    type: string;
    payload?: string | { banners?: BannersState };
  },
) => {
  switch (action.type) {
    case dismissBanner.type:
      if (!state.dismissedBanners.includes(action.payload as string)) {
        return {
          ...state,
          dismissedBanners: [
            ...state.dismissedBanners,
            action.payload as string,
          ],
        };
      }
      return state;
    case REHYDRATE:
      if ((action.payload as { banners?: BannersState })?.banners) {
        return (action.payload as { banners: BannersState }).banners;
      }
      return state;
    default:
      return state;
  }
};

export default bannersReducer;
