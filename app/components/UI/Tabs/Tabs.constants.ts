import { Dimensions } from 'react-native';

// Grid layout constants for Tabs view
export const GRID_GAP = 12;
export const GRID_COLUMNS = 2;
export const GRID_PADDING = 16;

// Calculate thumbnail dimensions based on screen width
export const THUMB_WIDTH =
  (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP) / GRID_COLUMNS;
export const THUMB_HEIGHT = THUMB_WIDTH * 0.98; // Reduced from original 1.4 ratio (1.4 * 0.7 = 0.98)
