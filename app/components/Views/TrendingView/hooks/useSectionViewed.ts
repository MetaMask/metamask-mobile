import { useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';
import {
  trackExploreInteracted,
  type ExploreTabName,
  type ExploreSectionName,
} from '../search/analytics';

/**
 * One-shot section impression tracker.
 *
 * Attach `viewRef` to the wrapping View/Box of the section and call `onLayout`
 * in that element's `onLayout` prop. The event fires once per component mount
 * the first time the section is within the visible window height.
 */
export const useSectionViewed = (
  tabName: ExploreTabName,
  sectionName: ExploreSectionName,
) => {
  const hasTracked = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewRef = useRef<any>(null);

  const onLayout = useCallback(() => {
    if (hasTracked.current) return;
    viewRef.current?.measureInWindow(
      (_x: number, y: number, _w: number, height: number) => {
        const windowHeight = Dimensions.get('window').height;
        if (y < windowHeight && y + height > 0) {
          hasTracked.current = true;
          trackExploreInteracted({
            interaction_type: 'section_viewed',
            tab_name: tabName,
            section_name: sectionName,
          });
        }
      },
    );
  }, [tabName, sectionName]);

  return { viewRef, onLayout };
};
