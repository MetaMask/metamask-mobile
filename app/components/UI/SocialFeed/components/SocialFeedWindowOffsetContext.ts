import { createContext } from 'react';

/**
 * Points to add to a `measureInWindow` y taken inside the feed before placing
 * a window-level overlay (a `Modal`) at it.
 *
 * On iOS, `react-native-pager-view` renders each Social V1 page inside a
 * SwiftUI `TabView(.page)` child that starts below the top safe area. Fabric
 * measures from the React layout, which does not include that native offset,
 * so a measured y reads that many points too high.
 */
export const SocialFeedWindowOffsetContext = createContext(0);
