/* eslint-disable @typescript-eslint/default-param-last */
import { SDKState } from 'app/actions/sdk/state';
import { ActionType, Action } from '../../actions/sdk';

// sdk reducers
export const initialState: Readonly<SDKState> = {
  connections: {},
  approvedHosts: {},
  dappConnections: {},
  v2Connections: {},
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
    case ActionType.UPDATE_DAPP_CONNECTION:
      return {
        ...state,
        dappConnections: {
          ...state.dappConnections,
          [action.channelId]: action.connection,
        },
      };
    case ActionType.REMOVE_DAPP_CONNECTION: {
      const { [action.channelId]: _, ...dappConnections } =
        state.dappConnections;
      return {
        ...state,
        dappConnections,
      };
    }
    case ActionType.RESET_DAPP_CONNECTIONS:
      return {
        ...state,
        dappConnections: action.connections,
      };
    case ActionType.SET_SDK_V2_CONNECTIONS:
      return {
        ...state,
        v2Connections: action.connections,
      };
    default:
      return state;
  }
};

export default sdkReducer;
