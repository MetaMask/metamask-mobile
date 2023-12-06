// import MigratedStorage from '../../storage/MigratedStorage';
// import { persistReducer } from 'redux-persist';

const bookmarksReducer = (state = [], action) => {
  switch (action.type) {
    case 'ADD_BOOKMARK':
      return [...state, action.bookmark];
    case 'REMOVE_BOOKMARK':
      return state.filter((item) => item.url !== action.bookmark.url);
    default:
      return state;
  }
};

// const bookmarksPersistConfig = {
//   key: 'bookmarks',
//   blacklist: [],
//   storage: MigratedStorage,
// };

// const bookmarksReducer = persistReducer(bookmarksPersistConfig, reducer);

export default bookmarksReducer;
