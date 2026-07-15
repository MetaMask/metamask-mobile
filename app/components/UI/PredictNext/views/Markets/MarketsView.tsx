import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import {
  useObservableState,
  usePredictController,
} from '../../hooks/usePredictController';

/**
 * U4 — Markets + Trade. Lists events, picks one market, previews + buys, then
 * sells (Cash Out). Claim is hidden by `supportsClaims: false`.
 */
export const MarketsView: React.FC<{ ownerAddress: string }> = ({ ownerAddress }) => {
  const controller = usePredictController();
  const marketData = useObservableState(controller.marketData);
  const trading = useObservableState(controller.trading);

  const [activeMarket, setActiveMarket] = useState<{
    event: PredictEvent;
    market: PredictMarket;
    outcome: PredictOutcome;
  } | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [size, setSize] = useState('1');

  useEffect(() => {
    controller.marketData.loadEvents(ownerAddress).catch(() => undefined);
  }, [controller.marketData, ownerAddress]);

  if (activeMarket) {
    return (
      <TradePanel
        ownerAddress={ownerAddress}
        market={activeMarket}
        side={side}
        size={size}
        onChangeSide={setSide}
        onChangeSize={setSize}
        onBack={() => {
          setActiveMarket(null);
          controller.trading.reset();
        }}
        trading={trading}
      />
    );
  }

  return (
    <View>
      {marketData.loading && <ActivityIndicator />}
      {marketData.error && <Text style={styles.error}>{marketData.error}</Text>}
      <ScrollView style={{ maxHeight: 600 }}>
        {marketData.events.map((event) => (
          <View key={event.id} style={styles.eventBlock}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {event.markets.map((market) => (
              <View key={market.id} style={styles.marketBlock}>
                <Text style={styles.marketTitle}>{market.title}</Text>
                <View style={styles.outcomeRow}>
                  {market.outcomes.map((outcome) => (
                    <TouchableOpacity
                      key={outcome.id}
                      style={styles.outcomeBtn}
                      onPress={() => setActiveMarket({ event, market, outcome })}
                    >
                      <Text style={styles.outcomeLabel}>{outcome.label}</Text>
                      <Text style={styles.outcomePrice}>${outcome.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const TradePanel: React.FC<{
  ownerAddress: string;
  market: { event: PredictEvent; market: PredictMarket; outcome: PredictOutcome };
  side: 'buy' | 'sell';
  size: string;
  onChangeSide: (s: 'buy' | 'sell') => void;
  onChangeSize: (s: string) => void;
  onBack: () => void;
  trading: ReturnType<typeof useObservableState<ReturnType<ReturnType<typeof usePredictController>['trading']['getState']>>>;
}> = ({ ownerAddress, market, side, size, onChangeSide, onChangeSize, onBack, trading }) => {
  const controller = usePredictController();
  return (
    <View>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← back</Text>
      </TouchableOpacity>
      <Text style={styles.eventTitle}>{market.event.title}</Text>
      <Text style={styles.marketTitle}>{market.market.title}</Text>
      <Text style={styles.outcomeLabel}>
        {market.outcome.label} @ ${market.outcome.price}
      </Text>

      <View style={styles.sideRow}>
        {(['buy', 'sell'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sideBtn, side === s && styles.sideBtnActive]}
            onPress={() => onChangeSide(s)}
          >
            <Text style={styles.sideText}>{s.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{side === 'buy' ? 'spend (USDC)' : 'shares'}</Text>
        <TextInput
          style={styles.input}
          value={size}
          onChangeText={onChangeSize}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={() =>
          controller.trading.preview({
            ownerAddress,
            eventId: market.event.id,
            marketId: market.market.id,
            outcomeId: market.outcome.id,
            side,
            size,
          })
        }
      >
        <Text style={styles.btnText}>Preview</Text>
      </TouchableOpacity>

      {trading.preview && (
        <View style={styles.info}>
          <Text style={styles.label}>share price</Text>
          <Text style={styles.mono}>${trading.preview.sharePrice}</Text>
          <Text style={styles.label}>max spent / min received</Text>
          <Text style={styles.mono}>
            {trading.preview.maxAmountSpent} / {trading.preview.minAmountReceived}
          </Text>
          <Text style={styles.label}>venue fee</Text>
          <Text style={styles.mono}>{trading.preview.fees?.venueFee}</Text>
          <TouchableOpacity
            style={[styles.btn, trading.status === 'placing' && styles.btnDisabled]}
            onPress={() => controller.trading.submit({ ownerAddress })}
            disabled={trading.status === 'placing'}
          >
            <Text style={styles.btnText}>
              {trading.status === 'placing' ? 'placing…' : `Place ${side.toUpperCase()} (FOK)`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {trading.receipt && (
        <View style={styles.info}>
          <Text style={styles.label}>order_id</Text>
          <Text style={styles.mono}>{trading.receipt.orderId}</Text>
          <Text style={styles.label}>status</Text>
          <Text style={styles.mono}>{trading.receipt.status}</Text>
          <Text style={styles.label}>spent / received</Text>
          <Text style={styles.mono}>
            {trading.receipt.spentAmount} / {trading.receipt.receivedAmount}
          </Text>
        </View>
      )}

      {trading.error && (
        <Text style={styles.error}>
          {trading.error.code}: {trading.error.message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  eventBlock: { marginBottom: 14, padding: 8, backgroundColor: '#161b22', borderRadius: 6 },
  eventTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  marketBlock: { marginVertical: 6, paddingLeft: 8 },
  marketTitle: { color: '#d1d5db', fontSize: 13 },
  outcomeRow: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  outcomeBtn: {
    backgroundColor: '#1f2937',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  outcomeLabel: { color: '#fff', fontSize: 13 },
  outcomePrice: { color: '#9aa4b2', fontSize: 12 },
  back: { color: '#3b82f6', marginBottom: 8 },
  sideRow: { flexDirection: 'row', marginVertical: 10 },
  sideBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#161b22',
    marginRight: 8,
  },
  sideBtnActive: { backgroundColor: '#3b82f6' },
  sideText: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  rowLabel: { color: '#9aa4b2', width: 110, fontSize: 12 },
  input: { flex: 1, backgroundColor: '#161b22', color: '#fff', padding: 6, borderRadius: 4 },
  btn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 6,
  },
  btnDisabled: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontWeight: '600' },
  info: { backgroundColor: '#161b22', padding: 10, borderRadius: 6, marginVertical: 10 },
  label: { color: '#9aa4b2', fontSize: 11, marginBottom: 2 },
  mono: { color: '#fff', fontFamily: 'Menlo', marginBottom: 8 },
  error: { color: '#fca5a5', marginTop: 10 },
});
