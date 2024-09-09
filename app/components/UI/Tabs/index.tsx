import React, { PureComponent, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dimensions,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaInsetsContext,
  EdgeInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../locales/i18n';
import {
  MULTI_TAB_ADD_BUTTON,
  MULTI_TAB_CLOSE_ALL_BUTTON,
  MULTI_TAB_DONE_BUTTON,
  MULTI_TAB_NO_TABS_MESSAGE,
} from '../../../../wdio/screen-objects/testIDs/BrowserScreen/MultiTab.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  ThemeColors,
  ThemeShadows,
} from '@metamask/design-tokens/dist/types/js/themes/types';
import withMetricsAwareness, {
  WithMetricsAwarenessProps,
} from '../../hooks/useMetrics/withMetricsAwareness';
import TabThumbnail from './TabThumbnail';

interface Tab {
  id: number;
  url: string;
  image: string;
}

interface TabsProps extends WithMetricsAwarenessProps {
  tabs: Tab[];
  activeTab: number;
  newTab: () => void;
  closeTab: (tab: Tab) => void;
  closeAllTabs: () => void;
  closeTabsView: () => void;
  switchToTab: (tab: Tab) => void;
  animateCurrentTab: (tab: Tab) => void;
}

interface TabsState {
  currentTab: Tab | null;
}

const THUMB_VERTICAL_MARGIN = 15;
const NAVBAR_SIZE = Device.isIphoneX() ? 88 : 64;
const THUMB_HEIGHT =
  Dimensions.get('window').height / (Device.isIphone5S() ? 4 : 5) +
  THUMB_VERTICAL_MARGIN;
const ROWS_VISIBLE = Math.floor(
  (Dimensions.get('window').height - NAVBAR_SIZE - THUMB_VERTICAL_MARGIN) /
    THUMB_HEIGHT,
);
const TABS_VISIBLE = ROWS_VISIBLE;

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    noTabs: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.alternative,
    },
    noTabsTitle: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 18,
      marginBottom: 10,
    },
    noTabsDesc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
    },
    tabAction: {
      flex: 1,
      alignContent: 'center',
      alignSelf: 'flex-start',
      justifyContent: 'center',
    },

    tabActionleft: {
      justifyContent: 'center',
    },
    tabActionRight: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    tabActionDone: {
      ...fontStyles.bold,
    },
    tabActionText: {
      color: colors.primary.default,
      ...fontStyles.normal,
      fontSize: 16,
    },
    actionDisabled: {
      color: colors.text.alternative,
    },
    tabsView: {
      flex: 1,
      backgroundColor: colors.background.default,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    tabActions: {
      paddingHorizontal: 20,
      flexDirection: 'row',
      paddingTop: 17,
      ...shadows.size.md,
      backgroundColor: colors.background.default,
      height: 50,
    },
    tabs: {
      flex: 1,
      backgroundColor: colors.background.alternative,
    },
    tabsContent: {
      padding: 15,
      backgroundColor: importedColors.transparent,
    },
    newTabIcon: {
      marginTop: Device.isIos() ? 3 : 2.5,
      color: colors.primary.inverse,
      fontSize: 24,
      textAlign: 'center',
      justifyContent: 'center',
      alignContent: 'center',
    },
    newTabIconButton: {
      alignSelf: 'center',
      justifyContent: 'flex-start',
      alignContent: 'flex-start',
      backgroundColor: colors.primary.default,
      borderRadius: 100,
      width: 30,
      height: 30,
      marginTop: -7,
    },
  });

/**
 * Component that wraps all the thumbnails
 * representing all the open tabs
 */
const Tabs: React.FC<TabsProps & WithMetricsAwarenessProps> = ({
  tabs,
  activeTab,
  newTab,
  closeTab,
  closeAllTabs,
  closeTabsView,
  switchToTab,
  trackEvent,
}) => {
  const { colors, shadows } = useContext(ThemeContext) || mockTheme;
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const thumbnails = useRef<{ [key: number]: React.RefObject<TabThumbnail> }>({});
  const scrollview = useRef<ScrollView>(null);

  useEffect(() => {
    createTabsRef(tabs);
  }, [tabs]);

  useEffect(() => {
    if (tabs.length > TABS_VISIBLE) {
      const index = tabs.findIndex((tab) => tab.id === activeTab);
      const row = index + 1;
      const pos = (row - 1) * THUMB_HEIGHT;

      InteractionManager.runAfterInteractions(() => {
        scrollview.current?.scrollTo({ x: 0, y: pos, animated: true });
      });
    }
  }, [tabs, activeTab]);

  const createTabsRef = useCallback((tabsArray: Tab[]): void => {
    tabsArray.forEach((tab: Tab) => {
      thumbnails.current[tab.id] = React.createRef<TabThumbnail>();
    });
  }, []);

  const onSwitch = useCallback(async (tab: Tab): Promise<void> => {
    switchToTab(tab);
  }, [switchToTab]);

  const renderNoTabs = () => (
    <View style={styles.noTabs}>
      <Text style={styles.noTabsTitle} testID={MULTI_TAB_NO_TABS_MESSAGE}>
        {strings('browser.no_tabs_title')}
      </Text>
      <Text style={styles.noTabsDesc}>{strings('browser.no_tabs_desc')}</Text>
    </View>
  );

  const renderTabs = (tabsArray: Tab[], activeTabId: number) => (
    <ScrollView
      style={styles.tabs}
      contentContainerStyle={styles.tabsContent}
      ref={scrollview}
    >
      {tabsArray.map((tab: Tab) => (
        <TabThumbnail
          key={tab.id}
          ref={(ref: TabThumbnail | null) => {
            if (ref) {
              thumbnails.current[tab.id] = { current: ref };
            }
          }}
          tab={tab}
          isActiveTab={activeTabId === tab.id}
          onClose={() => closeTab(tab)}
          onSwitch={() => onSwitch(tab)}
        />
      ))}
    </ScrollView>
  );

  const onNewTabPress = useCallback((): void => {
    newTab();
    trackNewTabEvent(tabs.length);
  }, [newTab, tabs.length, trackNewTabEvent]);

  const trackNewTabEvent = useCallback((tabsNumber: number): void => {
    trackEvent(MetaMetricsEvents.BROWSER_NEW_TAB, {
      option_chosen: 'Browser Bottom Bar Menu',
      number_of_tabs: tabsNumber,
    });
  }, [trackEvent]);

  const renderTabActions = () => (
    <View style={styles.tabActions}>
      <TouchableOpacity
        style={[styles.tabAction, styles.tabActionleft]}
        onPress={closeAllTabs}
        testID={MULTI_TAB_CLOSE_ALL_BUTTON}
      >
        <Text
          style={[
            styles.tabActionText,
            tabs.length === 0 ? styles.actionDisabled : null,
          ]}
        >
          {strings('browser.tabs_close_all')}
        </Text>
      </TouchableOpacity>
      <View style={styles.tabAction}>
        <TouchableOpacity
          style={styles.newTabIconButton}
          onPress={onNewTabPress}
          testID={MULTI_TAB_ADD_BUTTON}
        >
          <MaterialCommunityIcon
            name="plus"
            size={15}
            style={styles.newTabIcon}
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.tabAction, styles.tabActionRight]}
        onPress={closeTabsView}
        testID={MULTI_TAB_DONE_BUTTON}
      >
        <Text
          style={[
            styles.tabActionText,
            styles.tabActionDone,
            tabs.length === 0 ? styles.actionDisabled : null,
          ]}
        >
          {strings('browser.tabs_done')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets: EdgeInsets | null) => (
        <View style={{ ...styles.tabsView, paddingTop: insets?.top ?? 0 }}>
          {tabs.length === 0
            ? renderNoTabs()
            : renderTabs(tabs, activeTab)}
          {renderTabActions()}
        </View>
      )}
    </SafeAreaInsetsContext.Consumer>
  );
};

export default withMetricsAwareness(Tabs);