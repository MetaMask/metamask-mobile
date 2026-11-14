// Third party dependencies.
import React, { useMemo, useState } from 'react';
import { Dimensions, type TextLayoutEvent } from 'react-native';
import {
  TabBar,
  type NavigationState,
  type Route,
  type SceneRendererProps,
  type TabDescriptor,
} from 'react-native-tab-view';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

export type TabViewRoute = Route & { title: string };

/** Pass as `initialLayout` on the tab view so the bar has a width on first paint */
export const TAB_VIEW_INITIAL_LAYOUT = {
  width: Dimensions.get('window').width,
};

export interface TabViewBarProps extends SceneRendererProps {
  navigationState: NavigationState<TabViewRoute>;
  /** Called with the pressed tab index, before the tab view jumps to it */
  onTabPress?: (index: number) => void;
  /** Tabs use `${testID}-tab-${index}` */
  testID?: string;
  twClassName?: string;
}

// The library renders the label twice and crossfades the copies while swiping.
// Bold glyphs are wider, so the regular copy is letter-spaced out to the bold
// width to keep both copies lined up and avoid a ghosted look. A hidden bold
// copy sizes the tab. Only the unfocused copy gets the test ID, otherwise it
// would be duplicated.
const TabLabel: React.FC<{
  title: string;
  focused: boolean;
  testID: string;
}> = ({ title, focused, testID }) => {
  const tw = useTailwind();
  const [boldWidth, setBoldWidth] = useState(0);
  const [regularWidth, setRegularWidth] = useState(0);
  const letterSpacing =
    regularWidth > 0 && boldWidth > regularWidth
      ? (boldWidth - regularWidth) / title.length
      : 0;

  const measure = (setWidth: (width: number) => void) => (e: TextLayoutEvent) =>
    setWidth(e.nativeEvent.lines[0]?.width ?? 0);

  return (
    <Box twClassName="items-center justify-center">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={1}
        style={tw.style('opacity-0')}
        onTextLayout={measure(setBoldWidth)}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        numberOfLines={1}
        style={tw.style('absolute opacity-0')}
        onTextLayout={measure(setRegularWidth)}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={focused ? FontWeight.Bold : FontWeight.Regular}
        twClassName={focused ? 'text-default' : 'text-alternative'}
        numberOfLines={1}
        ellipsizeMode="clip"
        testID={focused ? undefined : testID}
        style={[
          tw.style('absolute inset-0 flex items-center justify-center'),
          focused ? null : { letterSpacing },
        ]}
      >
        {title}
      </Text>
    </Box>
  );
};

/**
 * `react-native-tab-view` tab bar styled to match `TabsBar`. Scrolls when the
 * tabs overflow.
 */
const TabViewBar: React.FC<TabViewBarProps> = ({
  onTabPress,
  testID,
  twClassName,
  ...sceneProps
}) => {
  const tw = useTailwind();
  const { routes } = sceneProps.navigationState;

  const options = useMemo(
    (): Record<string, TabDescriptor<TabViewRoute>> =>
      Object.fromEntries(
        routes.map((route, index) => {
          const tabTestID = `${testID}-tab-${index}`;
          return [
            route.key,
            {
              testID: tabTestID,
              labelText: route.title,
              label: ({ focused }) => (
                <TabLabel
                  title={route.title}
                  focused={focused}
                  testID={`${tabTestID}-label`}
                />
              ),
            },
          ];
        }),
      ),
    [routes, testID],
  );

  return (
    <Box twClassName={twClassName} testID={testID}>
      <TabBar
        {...sceneProps}
        options={options}
        scrollEnabled
        gap={24}
        onTabPress={({ route }) => onTabPress?.(routes.indexOf(route))}
        tabStyle={tw.style('px-0 py-1 min-h-0 w-auto')}
        contentContainerStyle={tw.style('px-4')}
        indicatorStyle={tw.style('h-0.5 bg-icon-default')}
        style={tw.style('bg-transparent shadow-none', { elevation: 0 })}
        pressOpacity={1}
        pressColor="transparent"
        android_ripple={{ color: 'transparent' }}
      />
    </Box>
  );
};

export default TabViewBar;
