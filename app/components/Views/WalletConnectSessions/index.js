import React, { PureComponent } from 'react';
import {
  Alert,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import WebsiteIcon from '../../UI/WebsiteIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActionSheet from 'react-native-actionsheet';
import WalletConnect from '../../../core/WalletConnect/WalletConnect';
import Logger from '../../../util/Logger';
import { WALLETCONNECT_SESSIONS } from '../../../constants/storage';
import { ThemeContext, mockTheme } from '../../../util/theme';
import PropTypes from 'prop-types';
import WC2Manager, {
  isWC2Enabled,
} from '../../../../app/core/WalletConnect/WalletConnectV2';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollviewContent: {
      paddingTop: 20,
    },
    websiteIcon: {
      width: 44,
      height: 44,
    },
    row: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderBottomColor: colors.border.muted,
      borderBottomWidth: 1,
    },
    info: {
      marginLeft: 20,
      flex: 1,
    },
    name: {
      ...fontStyles.bold,
      fontSize: 16,
      marginBottom: 10,
      color: colors.text.default,
    },
    desc: {
      marginBottom: 10,
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
    },
    url: {
      marginBottom: 10,
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
    },
    emptyWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
  });

/**
 * View that displays all the active WalletConnect Sessions
 */
export default class WalletConnectSessions extends PureComponent {
  state = {
    sessions: [],
    sessionsV2: [],
  };

  actionSheet = null;

  sessionToRemove = null;

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('experimental_settings.wallet_connect_dapps'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount() {
    this.updateNavBar();
    this.loadSessions();
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  loadSessions = async () => {
    let sessions = [];
    let sessionsV2 = [];

    const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
    if (sessionData) {
      sessions = JSON.parse(sessionData);
    }

    if (isWC2Enabled) {
      // Add wallet connect v2 sessions to the list
      sessionsV2 = (await WC2Manager.getInstance())?.getSessions() || [];
    }

    this.setState({ ready: true, sessions, sessionsV2 });
  };

  renderDesc = (meta) => {
    const { description } = meta;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (description) {
      return <Text style={styles.desc}>{meta.description}</Text>;
    }
    return null;
  };

  onLongPress = (session) => {
    this.sessionToRemove = session;
    this.actionSheet.show();
  };

  createActionSheetRef = (ref) => {
    this.actionSheet = ref;
  };

  onActionSheetPress = (index) => (index === 0 ? this.killSession() : null);

  killSession = async () => {
    const isV2 = this.sessionToRemove.peerId === undefined;
    try {
      if (isV2 && isWC2Enabled) {
        await (
          await WC2Manager.getInstance()
        )?.removeSession(this.sessionToRemove);
      } else {
        await WalletConnect.killSession(this.sessionToRemove.peerId);
      }

      Alert.alert(
        strings('walletconnect_sessions.session_ended_title'),
        strings('walletconnect_sessions.session_ended_desc'),
      );
      this.loadSessions();
    } catch (e) {
      Logger.error(e, 'WC: Failed to kill session');
    }
  };

  renderSessions = () => {
    const { sessions, sessionsV2 } = this.state;

    return (
      <>
        {sessions.map((session) => this.renderV1(session))}
        {sessionsV2.map((session, index) => this.renderV2(session, index))}
      </>
    );
  };

  renderV1 = (session) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return (
      <TouchableOpacity
        // eslint-disable-next-line react/jsx-no-bind
        onLongPress={() => this.onLongPress(session)}
        key={`session_${session.peerId}`}
        style={styles.row}
      >
        <WebsiteIcon url={session.peerMeta.url} style={styles.websiteIcon} />
        <View style={styles.info}>
          <Text style={styles.name}>{session.peerMeta.name}</Text>
          <Text style={styles.url}>{session.peerId}</Text>
          <Text style={styles.url}>{session.peerMeta.url}</Text>
          {this.renderDesc(session.peerMeta)}
        </View>
      </TouchableOpacity>
    );
  };

  renderV2 = (session, index) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return (
      <TouchableOpacity
        // eslint-disable-next-line react/jsx-no-bind
        onLongPress={() => this.onLongPress(session)}
        key={`session_${session.id}_${index}`}
        style={styles.row}
      >
        <WebsiteIcon
          url={session.peer.metadata.url}
          style={styles.websiteIcon}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{session.peer.metadata.name}</Text>
          <Text style={styles.url}>{session.topic}</Text>
          <Text style={styles.url}>{session.peer.metadata.url}</Text>
          {this.renderDesc(session.peer.metadata)}
        </View>
      </TouchableOpacity>
    );
  };

  renderEmpty = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.emptyWrapper}>
        <Text style={styles.emptyText}>
          {strings('walletconnect_sessions.no_active_sessions')}
        </Text>
      </View>
    );
  };

  render = () => {
    const { ready, sessions, sessionsV2 } = this.state;
    if (!ready) return null;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance;
    const styles = createStyles(colors);

    const sessionsLength = sessions.length + sessionsV2.length;
    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={'wallet-connect-sessions-screen'}
      >
        <ScrollView
          style={styles.wrapper}
          contentContainerStyle={styles.scrollviewContent}
        >
          {sessionsLength > 0 ? this.renderSessions() : this.renderEmpty()}
        </ScrollView>
        <ActionSheet
          ref={this.createActionSheetRef}
          title={strings('walletconnect_sessions.end_session_title')}
          options={[
            strings('walletconnect_sessions.end'),
            strings('walletconnect_sessions.cancel'),
          ]}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          onPress={this.onActionSheetPress}
          theme={themeAppearance}
        />
      </SafeAreaView>
    );
  };
}

WalletConnectSessions.contextType = ThemeContext;

WalletConnectSessions.propTypes = {
  /**
   * Navigation object
   */
  navigation: PropTypes.object,
};
