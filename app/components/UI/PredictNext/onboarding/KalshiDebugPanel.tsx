import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { Modal, ScrollView } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import Engine from '../../../../core/Engine';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import { portfolioQueries } from '../queries/portfolioQueries';
import type { PredictBalance } from '../types';
import { createKalshiOnboardingClient } from './internal/createKalshiOnboardingClient';
import { requestKalshiRelink } from './internal/kalshiRelinkRequest';
import {
  getKalshiOnboardingState,
  subscribeKalshiOnboardingState,
} from './internal/kalshiOnboardingStateStore';
import {
  readKalshiDemoEmail,
  summarizeA2t,
  type A2tSummary,
} from './internal/kalshiDebugInfo';

interface DebugSnapshot {
  fetchedAt: string;
  status?: {
    state: string;
    intentStatus?: string;
    expireTs?: string | number;
  };
  statusError?: string;
  a2t: A2tSummary;
  lastEmail?: string;
}

export const KalshiDebugTestIds = {
  OPEN: 'user-debug-open',
  COPY_PROFILE_ID: 'user-debug-copy-profile-id',
} as const;

const Row = ({
  label,
  value,
  onCopy,
  copyTestID,
}: {
  label: string;
  value?: string;
  onCopy?: () => void;
  copyTestID?: string;
}) => (
  <Box twClassName="gap-0.5">
    <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      <Text variant={TextVariant.BodySm} selectable twClassName="flex-1">
        {value ?? '—'}
      </Text>
      {onCopy && value ? (
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSize.Sm}
          onPress={onCopy}
          accessibilityLabel={`Copy ${label}`}
          testID={copyTestID}
        />
      ) : null}
    </Box>
  </Box>
);

const describeError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const { status, code, message } = error as {
      status?: number;
      code?: string;
      message?: string;
    };
    return [status, code, message].filter(Boolean).join(' ') || 'error';
  }
  return String(error);
};

/**
 * TEMPORARY. Shows which Kalshi account this profile is linked to and what
 * Kalshi says about it. Delete with the demo onboarding.
 */
export const KalshiDebugPanel = ({
  balance,
  balanceError,
}: {
  balance?: PredictBalance;
  balanceError: Error | null;
}) => {
  const tw = useTailwind();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<DebugSnapshot>();

  const refresh = useCallback(async () => {
    setLoading(true);
    const next: DebugSnapshot = {
      fetchedAt: new Date().toISOString(),
      a2t: {},
    };
    try {
      next.a2t = summarizeA2t(
        await Engine.controllerMessenger.call(
          'PredictDeviceAuthService:getA2t',
        ),
      );
      // Keyed by this profile's id: MMKV outlives SRP switches, and an
      // unkeyed read would show another profile's email.
      next.lastEmail = await readKalshiDemoEmail(next.a2t.sub);
      // Status reads Kalshi's balance and drops the amount. The figure below is
      // the portfolio query, which stays put until it is invalidated. Start both
      // together so they share one Kalshi read.
      const [statusResult, balanceResult] = await Promise.allSettled([
        createKalshiOnboardingClient().getStatus(),
        Engine.context.PredictPortfolioService.invalidateQueries({
          queryKey: portfolioQueries.getBalance(KALSHI_VENUE_ID).queryKey,
        }),
      ]);
      if (statusResult.status === 'fulfilled') {
        next.status = {
          state: statusResult.value.state,
          intentStatus: statusResult.value.intentStatus,
          expireTs: statusResult.value.expireTs,
        };
      } else {
        next.statusError = `${next.statusError ? `${next.statusError}; ` : ''}status: ${describeError(statusResult.reason)}`;
      }
      if (balanceResult.status === 'rejected') {
        next.statusError = `${next.statusError ? `${next.statusError}; ` : ''}balance: ${describeError(balanceResult.reason)}`;
      }
      setSnapshot(next);
    } catch (error) {
      next.statusError = `${next.statusError ? `${next.statusError}; ` : ''}${describeError(error)}`;
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(() => {
    setVisible(true);
    refresh().catch(() => undefined);
  }, [refresh]);

  // Close this sheet first so two sheets are not presented at once.
  const relink = useCallback(() => {
    setVisible(false);
    setTimeout(requestKalshiRelink, 600);
  }, []);

  const copyProfileId = useCallback(() => {
    const profileId = snapshot?.a2t.sub;
    if (profileId) {
      Clipboard.setString(profileId);
    }
  }, [snapshot?.a2t.sub]);

  return (
    <Box>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={open}
        testID={KalshiDebugTestIds.OPEN}
      >
        User debug
      </Button>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <ScrollView contentContainerStyle={tw.style('p-4 gap-3')}>
          <Text variant={TextVariant.HeadingMd}>User demo debug</Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Temporary. Shows what predict-api and Kalshi report for this
            profile.
          </Text>

          <Row
            label="Email typed in onboarding (this profile, last attempt)"
            value={snapshot?.lastEmail ?? 'none remembered'}
          />
          {/* TEMPORARY: the flow publishes its machine step for this row. */}
          <Row
            label="Onboarding flow state"
            value={useSyncExternalStore(
              subscribeKalshiOnboardingState,
              getKalshiOnboardingState,
            )}
          />
          <Row label="Onboarding state" value={snapshot?.status?.state} />
          <Row
            label="Kalshi intent status"
            value={snapshot?.status?.intentStatus}
          />
          <Row
            label="Intent expireTs"
            value={
              snapshot?.status?.expireTs !== undefined
                ? String(snapshot.status.expireTs)
                : undefined
            }
          />
          <Row
            label="Profile ID (A2T sub)"
            value={snapshot?.a2t.sub}
            onCopy={copyProfileId}
            copyTestID={KalshiDebugTestIds.COPY_PROFILE_ID}
          />
          <Row label="A2T audience" value={snapshot?.a2t.aud} />
          <Row label="A2T expires" value={snapshot?.a2t.expiresAt} />
          <Row
            label="Balance the app is showing"
            value={
              balance
                ? JSON.stringify(balance)
                : balanceError
                  ? `error: ${describeError(balanceError)}`
                  : 'loading'
            }
          />
          <Row label="Status error" value={snapshot?.statusError} />
          <Row label="Fetched at" value={snapshot?.fetchedAt} />

          <Box twClassName="flex-row gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              onPress={refresh}
              isLoading={loading}
            >
              Refresh
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              onPress={() => setVisible(false)}
            >
              Close
            </Button>
          </Box>

          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Relink replaces the Kalshi account bound to this profile with the
            one whose email you enter. Enter the email, the code, then the MFA
            code if Kalshi asks, and confirm the wallet.
          </Text>
          <Box twClassName="self-start">
            <Button variant={ButtonVariant.Secondary} onPress={relink}>
              Relink Kalshi account
            </Button>
          </Box>
        </ScrollView>
      </Modal>
    </Box>
  );
};
