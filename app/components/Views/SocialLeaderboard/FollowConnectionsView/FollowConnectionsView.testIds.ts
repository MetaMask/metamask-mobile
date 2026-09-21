export const FollowConnectionsViewSelectorsIDs = {
  CONTAINER: 'follow-connections-view-container',
  HEADER: 'follow-connections-view-header',
  BACK_BUTTON: 'follow-connections-view-back-button',
  TABS: 'follow-connections-view-tabs',
  FOLLOWERS_TAB: 'follow-connections-view-followers-tab',
  FOLLOWING_TAB: 'follow-connections-view-following-tab',
  FOLLOWERS_LIST: 'follow-connections-view-followers-list',
  FOLLOWING_LIST: 'follow-connections-view-following-list',
  FOLLOWING_LOADING: 'follow-connections-view-following-loading',
  FOLLOWING_ERROR: 'follow-connections-view-following-error',
  FOLLOWING_RETRY: 'follow-connections-view-following-retry',
  FOLLOWING_EMPTY: 'follow-connections-view-following-empty',
  FOLLOWERS_EMPTY: 'follow-connections-view-followers-empty',
} as const;

export const getConnectionRowTestId = (id: string): string =>
  `follow-connections-row-${id}`;

export const getConnectionFollowButtonTestId = (id: string): string =>
  `follow-connections-follow-button-${id}`;
