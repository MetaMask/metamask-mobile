export const AddBookmarkViewSelectorsIDs = {
  CANCEL_BUTTON: 'add-bookmark-cancel-button',
  CONFIRM_BUTTON: 'add-bookmark-confirm-button',
  CONTAINER: 'add-bookmark-screen',
  BOOKMARK_TITLE: 'add-bookmark-title',
  URL_TEXT: 'add-bookmark-url',
} as const;

export type AddBookmarkViewSelectorsIDsType =
  typeof AddBookmarkViewSelectorsIDs;
