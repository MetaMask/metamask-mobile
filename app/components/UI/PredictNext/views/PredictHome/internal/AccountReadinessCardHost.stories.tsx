import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type {
  AccountReadinessCard,
  AccountReadinessValue,
} from '../../../onboarding/accountReadiness.types';
import type { PredictBalance } from '../../../types';
import { AccountReadinessCardHost } from './AccountReadinessCardHost';
import { BalanceSummary } from './BalanceSummary';

const noop = () => undefined;

const BALANCE: PredictBalance = {
  venueId: 'kalshi' as PredictBalance['venueId'],
  currency: 'USD',
  available: '1250.00' as PredictBalance['available'],
};

const createValue = (
  card: AccountReadinessCard,
  overrides: Partial<Omit<AccountReadinessValue, 'card'>> = {},
): AccountReadinessValue => ({
  readiness: 'setup_required',
  card,
  connection: 'online',
  accountActions: 'readiness_gated',
  setup: 'closed',
  latency: 'unknown',
  readError: 'none',
  isRefreshing: false,
  refreshStatus: noop,
  startSetup: noop,
  retrySetup: noop,
  dismissVerified: noop,
  ...overrides,
});

/** Home's readiness slot sits under Balance Summary; mirror that context. */
const HomeFrame = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <ScrollView
      contentContainerStyle={tw.style('gap-6 px-4 pt-16 pb-12')}
      style={tw.style('flex-1 bg-default')}
    >
      <Text variant={TextVariant.HeadingSm}>Predict</Text>
      <BalanceSummary
        balance={BALANCE}
        error={null}
        isLoading={false}
        onRetry={noop}
      />
      {children}
    </ScrollView>
  );
};

const State = ({
  label,
  value,
}: {
  label: string;
  value: AccountReadinessValue;
}) => (
  <Box gap={2}>
    <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
      {label}
    </Text>
    <AccountReadinessCardHost value={value} />
  </Box>
);

const ALL_STATES = [
  ['Not started', createValue({ kind: 'not_started' })],
  [
    'Finish verifying',
    createValue({ kind: 'finish_verifying', intent: 'resume' }),
  ],
  ['Verifying', createValue({ kind: 'verifying' }, { readiness: 'verifying' })],
  ['Verified', createValue({ kind: 'verified' }, { readiness: 'ready' })],
  [
    'Activation required',
    createValue({
      kind: 'action_required',
      reason: 'activation_required',
      intent: 'resume',
    }),
  ],
  [
    'Verification failed',
    createValue({
      kind: 'action_required',
      reason: 'verification_failed',
      intent: 'restart',
    }),
  ],
  [
    'Cancelled',
    createValue({
      kind: 'action_required',
      reason: 'cancelled',
      intent: 'restart',
    }),
  ],
  [
    'Status unavailable',
    createValue({
      kind: 'action_required',
      reason: 'status_unsupported',
      intent: 'retry',
    }),
  ],
  ['Offline', createValue({ kind: 'hidden' }, { connection: 'offline' })],
  [
    'Read failed',
    createValue({ kind: 'hidden' }, { readError: 'unavailable' }),
  ],
  ['Slow connection', createValue({ kind: 'hidden' }, { latency: 'slow' })],
  [
    'Refreshing',
    createValue({ kind: 'hidden' }, { isRefreshing: true, latency: 'slow' }),
  ],
  ['Setup opening', createValue({ kind: 'not_started' }, { setup: 'opening' })],
] as const satisfies readonly (readonly [string, AccountReadinessValue])[];

const meta = {
  title: 'Predict Next / Home / Account readiness cards',
  component: AccountReadinessCardHost,
  parameters: {
    docs: {
      description: {
        component:
          'Home readiness slot, shown under Balance Summary. Each story mirrors one AccountReadinessValue; copy and actions come from the production card components.',
      },
    },
  },
};

export default meta;

export const AllStates = {
  render: () => (
    <HomeFrame>
      {ALL_STATES.map(([label, value]) => (
        <State key={label} label={label} value={value} />
      ))}
    </HomeFrame>
  ),
};
