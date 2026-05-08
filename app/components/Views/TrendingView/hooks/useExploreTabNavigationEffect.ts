import { useCallback, useMemo, useRef } from 'react';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { TabsListRef } from '../../../../component-library/components-temp/Tabs/TabsList/TabsList.types';

interface ExploreFeedRouteParams {
  initialTab?: number | null;
}

interface UseExploreTabNavigationEffectProps {
  defaultTabIndex: number;
}

export const useExploreTabNavigationEffect = ({
  defaultTabIndex,
}: UseExploreTabNavigationEffectProps) => {
  const route =
    useRoute<RouteProp<{ params: ExploreFeedRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const tabsListRef = useRef<TabsListRef>(null);

  const initialTabIndex = route.params?.initialTab;

  const initialActiveIndex = useMemo(
    () => initialTabIndex ?? defaultTabIndex,
    [defaultTabIndex, initialTabIndex],
  );

  useFocusEffect(
    useCallback(() => {
      if (initialTabIndex === undefined) {
        return;
      }

      tabsListRef.current?.goToTabIndex(initialTabIndex);
      navigation.setParams?.({ initialTab: null });
    }, [initialTabIndex, navigation]),
  );

  return {
    tabsListRef,
    initialActiveIndex,
  };
};
