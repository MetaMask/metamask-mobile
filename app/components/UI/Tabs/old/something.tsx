import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  Dimensions,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../../locales/i18n';
import { BrowserViewSelectorsIDs } from '../../../../../e2e/selectors/Browser/BrowserView.selectors';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { fontStyles, colors as importedColors } from '../../../../styles/common';
import Device from '../../../../util/device';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import withMetricsAwareness from '../../../hooks/useMetrics/withMetricsAwareness';
import TabThumbnail from '../TabThumbnail';
import { IUseMetricsHook } from '../../../hooks/useMetrics/useMetrics.types';
import { Shadows, Colors } from '../../../../util/theme/models';
import { IWithMetricsAwarenessProps } from '../../../hooks/useMetrics/withMetricsAwareness.types';

interface Tab {
  id: number;
  url: string;
  image: string;
}

interface TabsProps extends IWithMetricsAwarenessProps {
  tabs: Tab[];
  activeTab: number;
  newTab: () => void;
  closeTab: (tab: Tab) => void;
  closeAllTabs: () => void;
  closeTabsView: () => void;
  switchToTab: (tab: Tab) => void;
  animateCurrentTab?: (tab: Tab) => void;
  metrics: IUseMetricsHook;
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

const createStyles = (colors: Colors, shadows: Shadows) =>
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

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  newTab,
  closeTab,
  closeAllTabs,
  closeTabsView,
  switchToTab,
  metrics,
}) => {
  const [thumbnails, setThumbnails] = useState<Record<number, React.RefObject<unknown>>>({});
  const scrollview = useRef<ScrollView>(null);
  const themeContext = useContext(ThemeContext);
  const colors = themeContext.colors || mockTheme.colors;
  const shadows = themeContext.shadows || mockTheme.shadows;
  const styles = createStyles(colors, shadows);

  useEffect(() => {
    const refs: Record<number, React.RefObject<unknown>> = {};
    tabs.forEach((tab) => {
      refs[tab.id] = React.createRef();
    });
    setThumbnails(refs);
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

  const onSwitch = (tab: Tab) => {
    switchToTab(tab);
  };

  const onNewTabPress = () => {
    newTab();
    metrics.trackEvent(
      metrics
        .createEventBuilder(MetaMetricsEvents.BROWSER_NEW_TAB)
        .addProperties({
          option_chosen: 'Browser Bottom Bar Menu',
          number_of_tabs: tabs.length,
        })
        .build(),
    );
  };

  const renderNoTabs = () => (
    <View style={styles.noTabs}>
      <Text style={styles.noTabsTitle} testID={BrowserViewSelectorsIDs.NO_TABS_MESSAGE}>
        {strings('browser.no_tabs_title')}
      </Text>
      <Text style={styles.noTabsDesc}>{strings('browser.no_tabs_desc')}</Text>
    </View>
  );

  const renderTabs = () => (
    <ScrollView style={styles.tabs} contentContainerStyle={styles.tabsContent} ref={scrollview}>
      {tabs.map((tab) => (
        <TabThumbnail
          ref={thumbnails[tab.id]}
          key={tab.id}
          tab={tab as Tab}
          isActiveTab={activeTab === tab.id}
          onClose={closeTab}
          onSwitch={onSwitch}
        />
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => (
        <View style={{ ...styles.tabsView, paddingTop: insets?.top }}>
          {tabs.length === 0 ? renderNoTabs() : renderTabs()}
          <View style={styles.tabActions}>
            <TouchableOpacity
              style={[styles.tabAction, styles.tabActionleft]}
              onPress={closeAllTabs}
              testID={BrowserViewSelectorsIDs.CLOSE_ALL_TABS}
            >
              <Text style={[styles.tabActionText, tabs.length === 0 && styles.actionDisabled]}>
                {strings('browser.tabs_close_all')}
              </Text>
            </TouchableOpacity>
            <View style={styles.tabAction}>
              <TouchableOpacity
                style={styles.newTabIconButton}
                onPress={onNewTabPress}
                testID={BrowserViewSelectorsIDs.ADD_NEW_TAB}
              >
                <MaterialCommunityIcon name="plus" size={15} style={styles.newTabIcon} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.tabAction, styles.tabActionRight]}
              onPress={closeTabsView}
              testID={BrowserViewSelectorsIDs.DONE_BUTTON}
            >
              <Text style={[styles.tabActionText, styles.tabActionDone, tabs.length === 0 && styles.actionDisabled]}>
                {strings('browser.tabs_done')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaInsetsContext.Consumer>
  );
};

export default withMetricsAwareness(Tabs);
