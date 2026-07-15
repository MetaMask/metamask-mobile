import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { PredictController } from '../controller/PredictController';
import {
  PredictControllerProvider,
  useObservableState,
  usePredictController,
} from '../hooks/usePredictController';
import { DEFAULT_BACKEND_BASE_URL } from '../constants/venueConfig';
import { AccountSetupView } from './AccountSetup/AccountSetupView';
import { DepositView } from './Deposit/DepositView';
import { WithdrawView } from './Withdraw/WithdrawView';
import { MarketsView } from './Markets/MarketsView';
import { PortfolioView } from './Portfolio/PortfolioView';

/**
 * Dev-menu reachable entry view for the Kalshi POC. Owns one PredictController
 * for the lifetime of the screen, picks the active MetaMask account address as
 * the externalUserId, and hosts the five POC sub-views as a tabbed picker.
 */

type Tab = 'setup' | 'deposit' | 'withdraw' | 'markets' | 'portfolio';

const TABS: { id: Tab; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'markets', label: 'Markets' },
  { id: 'portfolio', label: 'Portfolio' },
];

const PredictPocRoot: React.FC = () => {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const ownerAddress = selectedAccount?.address?.toLowerCase() ?? '';

  const [backendBaseUrl, setBackendBaseUrl] = useState(DEFAULT_BACKEND_BASE_URL);
  const [activeTab, setActiveTab] = useState<Tab>('setup');

  const controller = useMemo(
    () => new PredictController({ backendBaseUrl, ownerAddress }),
    [backendBaseUrl, ownerAddress],
  );

  useEffect(() => () => controller.destroy(), [controller]);
  useEffect(() => {
    if (!ownerAddress) return;
    controller.setOwnerAddress(ownerAddress);
    controller.session.resumeAccountSetup(ownerAddress).catch(() => undefined);
    controller.session.refreshReadiness(ownerAddress).catch(() => undefined);
  }, [controller, ownerAddress]);

  if (!ownerAddress) {
    return (
      <View style={styles.center}>
        <Text>No MetaMask account selected.</Text>
      </View>
    );
  }

  return (
    <PredictControllerProvider value={controller}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Kalshi POC</Text>
        <Text style={styles.meta}>owner: {ownerAddress}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>backend</Text>
          <TextInput
            style={styles.input}
            value={backendBaseUrl}
            onChangeText={setBackendBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <ReadinessBadge />

        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={activeTab === tab.id ? styles.tabActiveLabel : styles.tabLabel}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'setup' && <AccountSetupView ownerAddress={ownerAddress} />}
        {activeTab === 'deposit' && <DepositView ownerAddress={ownerAddress} />}
        {activeTab === 'withdraw' && <WithdrawView ownerAddress={ownerAddress} />}
        {activeTab === 'markets' && <MarketsView ownerAddress={ownerAddress} />}
        {activeTab === 'portfolio' && <PortfolioView ownerAddress={ownerAddress} />}
      </ScrollView>
    </PredictControllerProvider>
  );
};

const ReadinessBadge: React.FC = () => {
  const controller = usePredictController();
  const sessionState = useObservableState(controller.session);
  const readiness = sessionState.readiness;
  if (!readiness) return null;
  return (
    <View style={styles.readiness}>
      <Text style={styles.readinessText}>
        Readiness: {readiness.status} {readiness.canTrade ? '(can trade)' : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1117' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { color: '#fff', fontSize: 22, fontWeight: '600', marginBottom: 4 },
  meta: { color: '#9aa4b2', fontSize: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  label: { color: '#9aa4b2', width: 80 },
  input: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
  },
  readiness: { padding: 8, backgroundColor: '#161b22', borderRadius: 6, marginBottom: 12 },
  readinessText: { color: '#fff' },
  tabs: { flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap' },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#161b22',
    marginRight: 6,
    marginBottom: 6,
  },
  tabActive: { backgroundColor: '#3b82f6' },
  tabLabel: { color: '#9aa4b2' },
  tabActiveLabel: { color: '#fff', fontWeight: '600' },
});

export default PredictPocRoot;
