import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  useObservableState,
  usePredictController,
} from '../../hooks/usePredictController';

/**
 * U5 — Portfolio. Surfaces balance, positions, and activity. Settlement rows
 * are activity items with type === 'settlement'.
 */
export const PortfolioView: React.FC<{ ownerAddress: string }> = ({ ownerAddress }) => {
  const controller = usePredictController();
  const portfolio = useObservableState(controller.portfolio);

  useEffect(() => {
    controller.portfolio.refresh(ownerAddress).catch(() => undefined);
  }, [controller.portfolio, ownerAddress]);

  return (
    <View>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => controller.portfolio.refresh(ownerAddress)}
      >
        <Text style={styles.btnText}>Refresh</Text>
      </TouchableOpacity>

      <Text style={styles.label}>balance</Text>
      <Text style={styles.value}>
        {portfolio.balance ? `${portfolio.balance.amount} USDC` : '—'}
      </Text>

      <Text style={styles.label}>positions ({portfolio.positions.length})</Text>
      <ScrollView style={{ maxHeight: 200 }}>
        {portfolio.positions.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {p.title} · {p.outcomeLabel}
            </Text>
            <Text style={styles.rowMeta}>
              {p.size} shares @ ${p.averageEntryPrice} · status: {p.status}
              {p.optimistic ? ' (optimistic)' : ''}
            </Text>
          </View>
        ))}
        {portfolio.positions.length === 0 && <Text style={styles.empty}>no positions</Text>}
      </ScrollView>

      <Text style={styles.label}>activity ({portfolio.activity.length})</Text>
      <ScrollView style={{ maxHeight: 200 }}>
        {portfolio.activity.map((a) => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {a.type.toUpperCase()} · {a.title ?? a.marketId ?? ''}
            </Text>
            <Text style={styles.rowMeta}>
              {a.amount ?? '—'} USDC · {new Date(a.timestamp).toLocaleString()}
            </Text>
          </View>
        ))}
        {portfolio.activity.length === 0 && <Text style={styles.empty}>no activity</Text>}
      </ScrollView>

      {portfolio.error && <Text style={styles.error}>{portfolio.error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  label: { color: '#9aa4b2', fontSize: 12, marginTop: 12, marginBottom: 4 },
  value: { color: '#fff', fontSize: 16, marginBottom: 8 },
  row: { paddingVertical: 6, borderBottomColor: '#1f2937', borderBottomWidth: 1 },
  rowTitle: { color: '#fff', fontSize: 13 },
  rowMeta: { color: '#9aa4b2', fontSize: 11 },
  empty: { color: '#374151', fontStyle: 'italic' },
  error: { color: '#fca5a5', marginTop: 10 },
});
