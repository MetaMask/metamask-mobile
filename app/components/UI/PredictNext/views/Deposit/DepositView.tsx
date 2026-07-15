import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  useObservableState,
  usePredictController,
} from '../../hooks/usePredictController';

/**
 * U2 — Deposit view.
 *
 * Flow:
 *   1. Enter amount → prepareDeposit (backend → /deposit/crypto-addresses).
 *   2. UI shows the Kalshi one-time Base Sepolia USDC address.
 *   3. User sends USDC out-of-band (faucet) and pastes the tx_hash.
 *   4. submitDepositTxHash → backend → /deposit/indication (prefunds the sub-account).
 */
export const DepositView: React.FC<{ ownerAddress: string }> = ({ ownerAddress }) => {
  const controller = usePredictController();
  const txState = useObservableState(controller.transactions);
  const [amount, setAmount] = useState('10');
  const [txHash, setTxHash] = useState('');

  const plan = txState.plan;
  const walletPlan =
    plan && plan.kind === 'wallet_transfer' && plan.operation === 'deposit' ? plan : undefined;
  const depositAddress =
    walletPlan && walletPlan.request.namespace === 'eip155'
      ? walletPlan.request.to
      : undefined;

  return (
    <View>
      <Row label="amount (USDC)" value={amount} onChange={setAmount} />
      <Btn
        label={txState.status === 'preparing' ? 'preparing…' : 'Prepare deposit'}
        onPress={() => controller.transactions.prepareDeposit({ ownerAddress, amount })}
        disabled={txState.status === 'preparing'}
      />

      {walletPlan && depositAddress && (
        <View style={styles.info}>
          <Text style={styles.label}>send {walletPlan.amount} USDC on Base Sepolia to</Text>
          <Text style={styles.mono}>{depositAddress}</Text>
          <Text style={styles.label}>deposit_id: {walletPlan.venueReference}</Text>
        </View>
      )}

      {depositAddress && (
        <View>
          <Row label="tx hash" value={txHash} onChange={setTxHash} />
          <Btn
            label={txState.status === 'submitting' ? 'indicating…' : 'Submit tx hash → indication'}
            onPress={() => controller.transactions.submitDepositTxHash(txHash)}
            disabled={!txHash || txState.status === 'submitting'}
          />
        </View>
      )}

      {txState.receipt && (
        <View style={styles.info}>
          <Text style={styles.label}>status</Text>
          <Text style={styles.mono}>{txState.receipt.status}</Text>
          <Text style={styles.label}>amount</Text>
          <Text style={styles.mono}>{txState.receipt.amount} USDC</Text>
          <Text style={styles.label}>tx hash</Text>
          <Text style={styles.mono}>{txState.receipt.txHash}</Text>
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
  info: {
    backgroundColor: '#161b22',
    padding: 10,
    borderRadius: 6,
    marginVertical: 10,
  },
  label: { color: '#9aa4b2', fontSize: 11, marginBottom: 2 },
  mono: { color: '#fff', fontFamily: 'Menlo', marginBottom: 8 },
  error: { color: '#fca5a5', marginTop: 10 },
});
