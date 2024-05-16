type RejectionFromOrigin = Record<string, number[]>;

export const initialState: { rejections: RejectionFromOrigin } = {
  rejections: {},
};

/**
 * Reducer to keep track of requests from an origin that are rejected by the user.
 */
const requestsReducer = (
  state = initialState,
  action = { type: '', origin: '' },
) => {
  switch (action.type) {
    case 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN':
      return {
        rejections: {
          ...state.rejections,
          [action.origin]: [
            ...(state.rejections[action.origin as string] ?? []),
            new Date().getTime(),
          ],
        },
      };
    case 'RESET_REJECTIONS_TO_REQUEST_FROM_ORIGIN': {
      delete state.rejections[action.origin];
      return {
        rejections: { ...state.rejections },
      };
    }
    case 'RESET_ALL_REJECTIONS_TO_REQUEST':
      return {
        rejections: {},
      };
    default:
      return state;
  }
};

export default requestsReducer;
