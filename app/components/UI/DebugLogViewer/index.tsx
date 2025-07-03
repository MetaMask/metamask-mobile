import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAppThemeFromContext } from '../../../util/theme';
import { DebugLogCapture } from '../../../util/Logger';

interface DebugLogViewerProps {
  visible?: boolean;
}

const DebugLogViewer: React.FC<DebugLogViewerProps> = ({ visible = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const { colors } = useAppThemeFromContext();

  const styles = createStyles(colors);

  const refreshLogs = useCallback(() => {
    const logString = DebugLogCapture.getLogsAsString();
    const logCount = DebugLogCapture.getLogs().length;
    console.log('DebugLogViewer: Logs captured:', logString); // Debug
    console.log('DebugLogViewer: Log count:', logCount); // Debug
    console.log('DebugLogViewer: Is expanded:', isExpanded); // Debug
    console.log('DebugLogViewer: Log string length:', logString.length); // Debug
    console.log('DebugLogViewer: Log string first 200 chars:', logString.substring(0, 200)); // Debug
    console.log('DebugLogViewer: Setting logs state with length:', logString.length); // Debug
    setLogs(logString || 'No logs captured');
  }, [isExpanded]);

  // Auto-refresh logs when component mounts and when expanded
  useEffect(() => {
    // Add a test log to verify logging is working
    DebugLogCapture.addLog('debug', '🔧 DebugLogViewer', 'Component mounted, testing log capture');
    refreshLogs();
  }, [refreshLogs]);

  const clearLogs = useCallback(() => {
    Alert.alert(
      'Clear Debug Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            DebugLogCapture.clearLogs();
            refreshLogs();
          },
        },
      ],
    );
  }, [refreshLogs]);

  const toggleLogging = useCallback(() => {
    if (DebugLogCapture.isLoggingEnabled()) {
      DebugLogCapture.disable();
      Alert.alert('Debug Logging Disabled');
    } else {
      DebugLogCapture.enable();
      Alert.alert('Debug Logging Enabled');
    }
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Logs ({DebugLogCapture.getLogs().length})</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.button}
            onPress={toggleLogging}
          >
            <Text style={styles.buttonText}>
              {DebugLogCapture.isLoggingEnabled() ? 'Disable' : 'Enable'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={refreshLogs}
          >
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearLogs}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const newExpandedState = !isExpanded;
              setIsExpanded(newExpandedState);
              if (newExpandedState) {
                // Force refresh logs when expanding
                setTimeout(() => refreshLogs(), 100);
              }
            }}
          >
            <Text style={styles.buttonText}>
              {isExpanded ? 'Collapse' : 'Expand'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.logContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.logText}>Debug: Log count = {DebugLogCapture.getLogs().length}</Text>
            <Text style={styles.logText}>Debug: Logs length = {logs.length}</Text>
            <Text style={styles.logText}>Debug: Logs state type = {typeof logs}</Text>
            <Text style={styles.logText}>Debug: Logs empty? = {logs ? 'No' : 'Yes'}</Text>
            <Text style={styles.logText}>Debug: Raw logs preview:</Text>
            <Text style={styles.logText}>{logs ? logs.substring(0, 500) + '...' : 'No logs string'}</Text>
            <Text style={styles.logText}>{'\n'}</Text>
            <Text style={styles.logText}>Full Logs:</Text>
            <Text style={styles.logText}>{logs || 'No logs to display'}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: colors.background.default,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.default,
      maxHeight: '90%',
      minHeight: 200,
      zIndex: 1000,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      minHeight: 60,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text.default,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.primary.default,
      borderRadius: 6,
    },
    clearButton: {
      backgroundColor: colors.error.default,
    },
    buttonText: {
      color: colors.primary.inverse,
      fontSize: 14,
      fontWeight: '600',
    },
    logContainer: {
      flex: 1,
      maxHeight: 800,
      minHeight: 150,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 12,
    },
    logText: {
      fontSize: 10,
      fontFamily: 'monospace',
      color: colors.text.default,
      lineHeight: 14,
    },
  });

export default DebugLogViewer; 