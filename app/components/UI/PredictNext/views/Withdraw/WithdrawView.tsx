import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  useObservableState,
  usePredictController,
} from '../../hooks/usePredictController';

/**
 * U3 — Withdraw view.
 *
 * One-shot venue_api call: backend register-then-withdraw is hidden in
 * `createWithdrawPlan`. UI surfaces the resulting `transfer_id`.
 */
export const WithdrawView: React.FC<{ ownerAddress: string }> = ({ ownerAddress }) => {
  const controller = usePredictController();
  const txState = useObservableState(controller.transactions);
  const [amount, setAmount] = useState('5');
  const [destination, setDestination] = useState(ownerAddress);

  const transferId =
    txState.receipt?.operation === 'withdraw' ? txState.receipt.venueReference : undefined;

  return (
    <View>
      <Row label="amount (USDC)" value={amount} onChange={setAmount} />
      <Row label="destination" value={destination} onChange={setDestination} />
      <Btn
        label={txState.status === 'submitting' ? 'withdrawing…' : 'Submit withdraw'}
        onPress={() =>
          controller.transactions.submitWithdraw({
            ownerAddress,
            amount,
            destinationAddress: destination,
          })
        }
        disabled={txState.status === 'submitting'}
      />

      {transferId && (
        <View style={styles.info}>
          <Text style={styles.label}>transfer_id</Text>
          <Text style={styles.mono}>{transferId}</Text>
          <Text style={styles.label}>(settlement is asynchronous; no status endpoint on demo)</Text>
        </View>
      )}

      {txState.error && (
        <Text style={styles.error}>
          {txState.error.code}: {txState.error.message}
        </Text>
      )}
    </View>
  );
};

const Row: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
);

const Btn: React.FC<{ label: string; onPress: () => void; disabled?: boolean }> = ({
  label,
  onPress,
  disabled,
}) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.btnText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  rowLabel: { color: '#9aa4b2', width: 110, fontSize: 12 },
  input: {
    flex: 1,
    backgroundColor: '#161b22',
    color: '#fff',
    padding: 6,
    borderRadius: 4,
  },
  btn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 8,
  },
  btnDisabled: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontWeight: '600' },
  info: { backgroundColor: '#161b22', padding: 10, borderRadius: 6, marginVertical: 10 },
  label: { color: '#9aa4b2', fontSize: 11, marginBottom: 2 },
  mono: { color: '#fff', fontFamily: 'Menlo', marginBottom: 8 },
  error: { color: '#fca5a5', marginTop: 10 },
});
