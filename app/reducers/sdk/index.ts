/* eslint-disable @typescript-eslint/default-param-last */
import { SDKState } from 'app/actions/sdk/state';
import { ActionType, Action } from '../../actions/sdk';

// sdk reducers
export const initialState: Readonly<SDKState> = {
  connections: {},
  approvedHosts: {},
  androidConnections: {},
  wc2Metadata: undefined,
};

const sdkReducer = (
  state: SDKState = initialState,
  action: Action,
): SDKState => {
  switch (action.type) {
    case ActionType.WC2_METADATA:
      return {
        ...state,
        wc2Metadata: action.metadata,
      };
    case ActionType.DISCONNECT_ALL:
      // Set connected: false to all connections
      return {
        ...state,
        connections: Object.keys(state.connections).reduce(
          (acc, channelId) => ({
            ...acc,
            [channelId]: { ...state.connections[channelId], connected: false },
          }),
          {},
        ),
      };
    case ActionType.UPDATE_CONNECTION:
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.channelId]: action.connection,
        },
      };
    case ActionType.REMOVE_CONNECTION: {
      const { [action.channelId]: _, ...connections } = state.connections;
      return {
        ...state,
        connections,
      };
    }
    case ActionType.ADD_CONNECTION:
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.channelId]: action.connection,
        },
      };
    case ActionType.RESET_CONNECTIONS:
      return {
        ...state,
        connections: action.connections,
      };
    case ActionType.SET_CONNECTED:
      if (!state.connections[action.channelId]) {
        return state;
      }
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.channelId]: {
            ...state.connections[action.channelId],
            connected: action.connected,
          },
        },
      };
    case ActionType.REMOVE_APPROVED_HOST: {
      const { [action.channelId]: _, ...approvedHosts } = state.approvedHosts;
      return {
        ...state,
        approvedHosts,
      };
    }
    case ActionType.SET_APPROVED_HOST:
      return {
        ...state,
        approvedHosts: {
          ...state.approvedHosts,
          [action.channelId]: action.validUntil,
        },
      };
    case ActionType.UPDATE_ANDROID_CONNECTION:
      return {
        ...state,
        androidConnections: {
          ...state.androidConnections,
          [action.channelId]: action.connection,
        },
      };
    case ActionType.REMOVE_ANDROID_CONNECTION: {
      const { [action.channelId]: _, ...androidConnections } =
        state.androidConnections;
      return {
        ...state,
        androidConnections,
      };
    }
    case ActionType.RESET_ANDROID_CONNECTIONS:
      return {
        ...state,
        androidConnections: action.connections,
      };
    default:
      return state;
  }
};

export default sdkReducer;
