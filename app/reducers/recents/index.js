const recentsLength = 3;
const recentsReducer = (state = [], action) => {
  switch (action.type) {
    case 'ADD_RECENT':
      if (action.recent && !state.includes(action.recent)) {
        const recents = [action.recent, ...state];
        return Array.from(
          { length: recentsLength },
          (_, index) => recents[index],
        );
      }
      return state;
    default:
      return state;
  }
};
export default recentsReducer;
