export const BridgeViewSelectorsIDs = {
  SOURCE_TOKEN_AREA: 'source-token-area',
  DESTINATION_TOKEN_AREA: 'dest-token-area',
  SOURCE_TOKEN_INPUT: 'source-token-area-input',
  DESTINATION_TOKEN_INPUT: 'dest-token-area-input',
  CONFIRM_BUTTON: 'bridge-confirm-button',
  BRIDGE_VIEW_SCROLL: 'bridge-view-scroll',
} as const;

export type BridgeViewSelectorsIDsType = typeof BridgeViewSelectorsIDs;
