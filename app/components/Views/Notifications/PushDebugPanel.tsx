import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  clearPushDebugLog,
  getPushDebugLog,
  getPushDebugVariables,
  PushDebugEntry,
  PushDebugVariable,
} from '../../../util/notifications/pushDebugLog';

const TYPE_COLORS: Record<string, string> = {
  FCM_SETUP: '#607D8B',
  FCM_TOKEN_CREATED: '#4CAF50',
  FCM_FOREGROUND_RECEIVED: '#2196F3',
  FCM_FOREGROUND_PROCESSING: '#03A9F4',
  FCM_FOREGROUND_DISPLAYED: '#00BCD4',
  FCM_FOREGROUND_NO_DATA: '#FF9800',
  FCM_FOREGROUND_ERROR: '#F44336',
  FCM_BACKGROUND_RECEIVED: '#9C27B0',
  FCM_OPENED_FROM_BACKGROUND: '#E91E63',
  FCM_OPENED_FROM_KILLED: '#FF5722',
  FCM_PLATFORM_HANDLER_CALLED: '#8BC34A',
  FCM_PLATFORM_HANDLER_NO_TITLE: '#FF9800',
  FCM_PLATFORM_HANDLER_DISPLAYED: '#00BCD4',
  NOTIFEE_CHANNEL_CREATED: '#4CAF50',
  NOTIFEE_CHANNEL_NOT_FOUND: '#FF9800',
  NOTIFEE_DISPLAY_CALLED: '#607D8B',
  NOTIFEE_DISPLAY_DONE: '#00BCD4',
  NOTIFEE_DISPLAY_ERROR: '#F44336',
  NOTIFEE_FOREGROUND_EVENT: '#3F51B5',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

function EntryRow({ entry }: { entry: PushDebugEntry }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[entry.type] ?? '#888';
  return (
    <TouchableOpacity
      onPress={() => entry.detail && setExpanded((v) => !v)}
      activeOpacity={entry.detail ? 0.7 : 1}
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.rowContent}>
          <Text style={[styles.type, { color }]}>{entry.type}</Text>
          <Text style={styles.summary}>{entry.summary}</Text>
          <Text style={styles.time}>{formatTime(entry.timestamp)}</Text>
        </View>
      </View>
      {expanded && entry.detail ? (
        <Text style={styles.detail}>{entry.detail}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function VariableRow({ variable }: { variable: PushDebugVariable }) {
  const isSuspicious =
    variable.value === 'false' ||
    variable.value === 'undefined' ||
    variable.value === '(undefined)' ||
    variable.value === 'DENIED';
  return (
    <View style={styles.varRow}>
      <Text style={styles.varKey}>{variable.key}</Text>
      <Text style={[styles.varValue, isSuspicious && styles.varValueBad]}>
        {variable.value}
      </Text>
    </View>
  );
}

export default function PushDebugPanel() {
  const [entries, setEntries] = useState<PushDebugEntry[]>([]);
  const [variables, setVariables] = useState<PushDebugVariable[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<'variables' | 'log'>('variables');

  const load = useCallback(async () => {
    const [log, vars] = await Promise.all([
      getPushDebugLog(),
      getPushDebugVariables(),
    ]);
    setEntries(log);
    setVariables(vars);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = useCallback(async () => {
    await clearPushDebugLog();
    setEntries([]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCollapsed((v) => !v)}>
          <Text style={styles.title}>
            {collapsed ? '▶' : '▼'} Push Debug ({variables.length} vars,{' '}
            {entries.length} events)
          </Text>
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={load} style={styles.btn}>
            <Text style={styles.btnText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.btn}>
            <Text style={styles.btnText}>Clear log</Text>
          </TouchableOpacity>
        </View>
      </View>
      {!collapsed && (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity
              onPress={() => setTab('variables')}
              style={[styles.tab, tab === 'variables' && styles.tabActive]}
            >
              <Text style={styles.tabText}>Variables</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab('log')}
              style={[styles.tab, tab === 'log' && styles.tabActive]}
            >
              <Text style={styles.tabText}>Event log</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.list} nestedScrollEnabled>
            {tab === 'variables' ? (
              variables.length === 0 ? (
                <Text style={styles.empty}>No variables read yet.</Text>
              ) : (
                variables.map((v) => <VariableRow key={v.key} variable={v} />)
              )
            ) : entries.length === 0 ? (
              <Text style={styles.empty}>No push events logged yet.</Text>
            ) : (
              entries.map((e) => <EntryRow key={e.id} entry={e} />)
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    maxHeight: 340,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  btnText: {
    color: '#ccc',
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 4,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  tabActive: {
    backgroundColor: '#333',
  },
  tabText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  empty: {
    color: '#666',
    fontSize: 12,
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  varRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  varKey: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: 'monospace',
    flexShrink: 1,
    marginRight: 8,
  },
  varValue: {
    color: '#4CAF50',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  varValueBad: {
    color: '#FF5252',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginRight: 8,
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  type: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  summary: {
    color: '#ddd',
    fontSize: 12,
  },
  time: {
    color: '#555',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  detail: {
    color: '#999',
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#1a1a1a',
    padding: 8,
    marginBottom: 4,
  },
});
