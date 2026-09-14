import {
  BOTTOM_NAV_CLICKED_ACTION,
  BottomNavName,
  SearchInteractedSource,
  SearchInteractionType,
  buildBottomNavClickedProperties,
  buildSearchInteractedProperties,
} from '.';

describe('navigation event properties', () => {
  it('builds the bottom nav click with the shared action and the tab name', () => {
    expect(buildBottomNavClickedProperties(BottomNavName.Explore)).toEqual({
      action: BOTTOM_NAV_CLICKED_ACTION,
      name: 'explore',
    });
  });

  it('builds a search interaction with its source and type', () => {
    expect(
      buildSearchInteractedProperties(
        SearchInteractedSource.AccountList,
        SearchInteractionType.Searched,
      ),
    ).toEqual({ source: 'account_list', interaction_type: 'searched' });
  });
});
