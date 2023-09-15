// BEGIN: 3f8c9d4c9f2a
import { addBookmark, removeBookmark } from './index';

describe('bookmark actions', () => {
  it('should create an action to add a bookmark', () => {
    const bookmark = { title: 'Test Bookmark', url: 'https://example.com' };
    const expectedAction = {
      type: 'ADD_BOOKMARK',
      bookmark,
    };
    expect(addBookmark(bookmark)).toEqual(expectedAction);
  });

  it('should create an action to remove a bookmark', () => {
    const bookmark = { title: 'Test Bookmark', url: 'https://example.com' };
    const expectedAction = {
      type: 'REMOVE_BOOKMARK',
      bookmark,
    };
    expect(removeBookmark(bookmark)).toEqual(expectedAction);
  });
});
// END: 3f8c9d4c9f2a
