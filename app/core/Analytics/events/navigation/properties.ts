import {
  BOTTOM_NAV_CLICKED_ACTION,
  BottomNavName,
  SearchInteractedSource,
  SearchInteractionType,
} from './constants';

export const buildBottomNavClickedProperties = (name: BottomNavName) => ({
  action: BOTTOM_NAV_CLICKED_ACTION,
  name,
});

export const buildSearchInteractedProperties = (
  source: SearchInteractedSource,
  interactionType: SearchInteractionType,
) => ({
  source,
  interaction_type: interactionType,
});
