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
  RESTART: 'user-debug-restart',
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

/** `active`, or `link_pending · intent pending · expires 1793…`. */
const describeServerStatus = (snapshot?: DebugSnapshot): string => {
  if (!snapshot) {
    return 'reading…';
  }
  if (snapshot.statusError) {
    return `error: ${snapshot.statusError}`;
  }
  const status = snapshot.status;
  if (!status) {
    return 'unknown';
  }
  const parts = [status.state];
  if (status.intentStatus) {
    parts.push(`intent ${status.intentStatus}`);
  }
  if (status.expireTs !== undefined) {
    parts.push(`expires ${status.expireTs}`);
  }
  return parts.join(' · ');
};

/**
 * TEMPORARY. Shows where this profile stands in the Kalshi demo onboarding
 * and restarts the flow. Delete with the demo onboarding.
 */
export const KalshiDebugPanel = ({
  renderTrigger,
}: {
  /** Renders the trigger elsewhere, e.g. the screen header. */
  renderTrigger?: (open: () => void) => React.ReactNode;
}) => {
  const tw = useTailwind();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<DebugSnapshot>();
  // TEMPORARY: the flow publishes its machine step for this row.
  const flowStage = useSyncExternalStore(
    subscribeKalshiOnboardingState,
    getKalshiOnboardingState,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const next: DebugSnapshot = { a2t: {} };
    try {
      next.a2t = summarizeA2t(
        await Engine.controllerMessenger.call(
          'PredictDeviceAuthService:getA2t',
        ),
      );
      // Keyed by this profile's id: MMKV outlives SRP switches, and an
      // unkeyed read would show another profile's email.
      next.lastEmail = await readKalshiDemoEmail(next.a2t.sub);
      try {
        const status = await createKalshiOnboardingClient().getStatus();
        next.status = {
          state: status.state,
          intentStatus: status.intentStatus,
          expireTs: status.expireTs,
        };
      } catch (error) {
        next.statusError = `status: ${describeError(error)}`;
      }
    } catch (error) {
      next.statusError = describeError(error);
    }
    setSnapshot(next);
    setLoading(false);
  }, []);

  const open = useCallback(() => {
    setVisible(true);
    refresh().catch(() => undefined);
  }, [refresh]);

  // Restart remounts the gate's flow through the relink channel. Close this
  // sheet first so two sheets are not presented at once.
  const restart = useCallback(() => {
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
      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={open}
          testID={KalshiDebugTestIds.OPEN}
        >
          User debug
        </Button>
      )}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <ScrollView contentContainerStyle={tw.style('p-4 gap-3')}>
          <Text variant={TextVariant.HeadingMd}>User demo debug</Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            Temporary. Where this profile stands in the Kalshi demo onboarding.
          </Text>

          <Row
            label="Onboarding stage (hidden = dismissed this session)"
            value={flowStage}
          />
          <Row label="Server status" value={describeServerStatus(snapshot)} />
          <Row
            label="Email used (last attempt)"
            value={snapshot?.lastEmail ?? 'none remembered'}
          />
          <Row
            label="Profile ID (A2T sub)"
            value={snapshot?.a2t.sub}
            onCopy={copyProfileId}
            copyTestID={KalshiDebugTestIds.COPY_PROFILE_ID}
          />

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
            Restart closes this sheet and opens the onboarding flow again from
            the email step. For a profile Kalshi already activated, it relinks
            that account to this profile: enter the email, the code, the MFA
            code if Kalshi asks, then confirm the wallet.
          </Text>
          <Box twClassName="self-start">
            <Button
              variant={ButtonVariant.Secondary}
              onPress={restart}
              testID={KalshiDebugTestIds.RESTART}
            >
              Restart onboarding
            </Button>
          </Box>
        </ScrollView>
      </Modal>
    </Box>
  );
};
