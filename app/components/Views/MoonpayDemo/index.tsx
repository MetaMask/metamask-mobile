/**
 * MoonpayDemo — drives the MoonPay Identity API path end-to-end.
 *
 * Implements the integration walkthrough from the MoonPay Identity API
 * Partner Integration Guide (2026-06-22). The screen is structured as a
 * linear state machine that mirrors Steps 1-8 of the guide:
 *
 * terms — display MoonPay's Terms of Use; capture acceptance timestamp
 * session — POST /platform/v1/sessions via the local UKYC service
 * check — mount the Check frame (invisible) to detect a returning auth
 * auth — mount the Auth frame (visible) for email OTP when needed
 * form — confirm/edit the customer profile to submit
 * submit — POST /identities, then PATCH country, then PATCH rest
 * verify — POST /verifications
 * challenge — render the Challenge frame for liveness / doc capture
 * poll — GET /identities/{id} until terminal
 * done — show approved / rejected / blocked / manualReview
 *
 * State machine logic lives in `./useMoonpayIdentityFlow`. The HTTP layer
 * is in `./api`, crypto in `./crypto`, and the WebView bridge in
 * `./MoonpayFrame`.
 */

import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';
import type { IdentityStatus, IdentitySubmission } from './api';
import MoonpayFrame from './MoonpayFrame';
import useMoonpayReset from './useMoonpayReset';
import useMoonpayIdentityFlow, {
  DEMO_PROFILES,
  type DemoProfile,
  type Phase,
  type DebugEvent,
  type DebugSeverity,
} from './useMoonpayIdentityFlow';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMS_URL = 'https://www.moonpay.com/legal/terms';
const PRIVACY_URL = 'https://www.moonpay.com/legal/privacy_policy';
const DONE_DESCRIPTIONS: Record<IdentityStatus, string> = {
  created: 'Identity created — keep collecting requirements.',
  collecting: 'Collection in progress.',
  verifying: 'Verification in progress.',
  approved: 'Capability unlocked — proceed to a transaction (Step 8).',
  rejected:
    'Terminal — verification failed. Inform the customer that they cannot currently transact.',
  manualReview:
    'Held for human review. May transition to approved without further customer action — keep polling.',
  blocked:
    'Terminal — cannot proceed (sanctions, duplicate, geo-block, etc.). Do not retry.',
};
const SEVERITY_TO_COLOR: Record<DebugSeverity, TextColor> = {
  info: TextColor.TextAlternative,
  success: TextColor.SuccessDefault,
  warn: TextColor.WarningDefault,
  error: TextColor.ErrorDefault,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { flex: 1, marginLeft: 8 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  panel: { gap: 12 },
  termsBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  codeBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  bold: { fontWeight: 'bold' },
  profileSelector: {
    gap: 4,
  },
  profileDropdown: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  profileOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  profileTrigger: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  frameArea: {
    flex: 1,
    minHeight: 480,
  },
  donePanel: {
    borderRadius: 12,
  },
  errorPanel: {
    borderRadius: 12,
  },
  debugPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  debugList: {
    gap: 6,
  },
  debugEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    gap: 4,
  },
  debugEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugEntryData: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: undefined,
    }),
  },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

interface ThemeColors {
  background: { default: string; alternative: string };
  border: { muted: string };
  primary: { default: string };
}

const TermsPanel: React.FC<{
  email: string;
  onEmailChange: (v: string) => void;
  onAccept: () => void;
  colors: ThemeColors;
}> = ({ email, onEmailChange, onAccept, colors }) => (
  <View style={styles.panel}>
    <Text variant={TextVariant.HeadingSm}>Step 1 — Accept terms</Text>

    <View
      style={[
        styles.termsBlock,
        {
          backgroundColor: colors.background.alternative,
          borderColor: colors.border.muted,
        },
      ]}
    >
      <Text variant={TextVariant.BodySm} style={styles.bold}>
        MoonPay Services and Legal Framework
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        All regulated services, including digital asset purchase and sale
        transactions, fiat currency payments, and related services, are provided
        exclusively by our partner, MoonPay. By using our platform for such
        services, you are engaging directly with MoonPay which will conduct such
        services under its applicable licenses and regulatory approvals.
      </Text>
      <Text variant={TextVariant.BodySm} style={styles.bold}>
        Applicable Terms & Policies
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        By accessing these services, you agree to be bound by MoonPay&apos;s{' '}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.PrimaryDefault}
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          Terms of Use
        </Text>{' '}
        and{' '}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.PrimaryDefault}
          onPress={() => Linking.openURL(PRIVACY_URL)}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>

    <Text variant={TextVariant.BodySm}>Email (required for OTP)</Text>
    <TextInput
      value={email}
      onChangeText={onEmailChange}
      autoCapitalize="none"
      keyboardType="email-address"
      style={[
        styles.input,
        {
          borderColor: colors.border.muted,
          backgroundColor: colors.background.alternative,
        },
      ]}
    />

    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={onAccept}
    >
      Accept terms and start
    </Button>
  </View>
);

const PROFILE_LABELS: Record<DemoProfile, string> = {
  US: '🇺🇸  United States — Jane Doe',
  FR: '🇫🇷  France — Marie Dupont',
};
const PROFILE_KEYS: DemoProfile[] = ['US', 'FR'];

const SubmissionReviewPanel: React.FC<{
  submission: IdentitySubmission;
  onChange: (s: IdentitySubmission) => void;
  onSubmit: () => void;
  colors: ThemeColors;
}> = ({ submission, onChange, onSubmit, colors }) => {
  const [selectedProfile, setSelectedProfile] = useState<DemoProfile>('US');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const applyProfile = (profile: DemoProfile) => {
    setSelectedProfile(profile);
    onChange(DEMO_PROFILES[profile]);
    setDropdownOpen(false);
  };

  const phoneNumber = submission.phoneNumber?.number ?? '';
  const ssnValue =
    submission.taxIdentifiers?.find((t) => t.type === 'ssn')?.value ?? '';

  const setPhoneNumber = (number: string) =>
    onChange({
      ...submission,
      phoneNumber: { ...submission.phoneNumber, number },
    });

  const setSsn = (value: string) => {
    const existing = submission.taxIdentifiers ?? [];
    const taxIdentifiers = existing.some((t) => t.type === 'ssn')
      ? existing.map((t) => (t.type === 'ssn' ? { ...t, value } : t))
      : [...existing, { type: 'ssn' as const, value }];
    onChange({ ...submission, taxIdentifiers });
  };

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.border.muted,
      backgroundColor: colors.background.alternative,
    },
  ];

  return (
    <View style={styles.panel}>
      <Text variant={TextVariant.HeadingSm}>Steps 4-6 — Submit identity</Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Edit the fields MoonPay validates against (phone must be a real mobile;
        SSN must pass sandbox validation), then submit.
      </Text>

      <Text variant={TextVariant.BodySm}>Phone number (E.164, mobile)</Text>
      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        autoCapitalize="none"
        keyboardType="phone-pad"
        placeholder="+12025550143"
        style={inputStyle}
      />

      <Text variant={TextVariant.BodySm}>SSN</Text>
      <TextInput
        value={ssnValue}
        onChangeText={setSsn}
        autoCapitalize="none"
        keyboardType="number-pad"
        placeholder="123-45-6789"
        style={inputStyle}
      />

      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Full payload:
      </Text>
      <View
        style={[
          styles.codeBlock,
          {
            backgroundColor: colors.background.alternative,
            borderColor: colors.border.muted,
          },
        ]}
      >
        <Text variant={TextVariant.BodySm}>
          {JSON.stringify(submission, null, 2)}
        </Text>
      </View>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Will POST /identities, PATCH pending requirements, then POST
        /verifications. If a challenge is required, the Challenge frame will
        render.
      </Text>

      <View style={styles.profileSelector}>
        <Text variant={TextVariant.BodySm}>Demo profile preset</Text>
        <Pressable
          onPress={() => setDropdownOpen((v) => !v)}
          style={[
            styles.profileTrigger,
            {
              borderColor: colors.border.muted,
              backgroundColor: colors.background.alternative,
            },
          ]}
        >
          <Text variant={TextVariant.BodySm}>
            {PROFILE_LABELS[selectedProfile]}
          </Text>
          <Text variant={TextVariant.BodySm}>{dropdownOpen ? '▲' : '▼'}</Text>
        </Pressable>
        {dropdownOpen && (
          <View
            style={[
              styles.profileDropdown,
              {
                borderColor: colors.border.muted,
                backgroundColor: colors.background.default,
              },
            ]}
          >
            {PROFILE_KEYS.map((key) => {
              const isSelected = key === selectedProfile;
              return (
                <Pressable
                  key={key}
                  onPress={() => applyProfile(key)}
                  style={[
                    styles.profileOption,
                    isSelected && {
                      backgroundColor: colors.primary.default + '18',
                    },
                  ]}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={
                      isSelected
                        ? TextColor.PrimaryDefault
                        : TextColor.TextDefault
                    }
                  >
                    {PROFILE_LABELS[key]}
                  </Text>
                  {isSelected && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.PrimaryDefault}
                    >
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onSubmit}
      >
        Submit identity
      </Button>
    </View>
  );
};

const LoadingPanel: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.panel}>
    <Text variant={TextVariant.BodyMd}>{message}</Text>
  </View>
);

const DonePanel: React.FC<{
  status: IdentityStatus;
  colors: ThemeColors;
}> = ({ status, colors }) => (
  <View
    style={[
      styles.panel,
      styles.donePanel,
      { backgroundColor: colors.background.alternative },
    ]}
  >
    <Text variant={TextVariant.HeadingSm}>Final status: {status}</Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {DONE_DESCRIPTIONS[status] ?? ''}
    </Text>
  </View>
);

const DebugEntry: React.FC<{
  event: DebugEvent;
  colors: ThemeColors;
}> = ({ event, colors }) => {
  const color = SEVERITY_TO_COLOR[event.severity];
  const time = event.timestamp.slice(11, 23);
  let dataString: string;
  try {
    dataString = JSON.stringify(event.data, null, 2);
  } catch {
    dataString = String(event.data);
  }
  return (
    <View style={[styles.debugEntry, { borderColor: colors.border.muted }]}>
      <View style={styles.debugEntryHeader}>
        <Text variant={TextVariant.BodyXs} color={color}>
          {time}
        </Text>
        <Text variant={TextVariant.BodySm} style={styles.bold} color={color}>
          {event.label}
        </Text>
      </View>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        style={styles.debugEntryData}
      >
        {dataString}
      </Text>
    </View>
  );
};

const DebugPanel: React.FC<{
  events: DebugEvent[];
  onClear: () => void;
  colors: ThemeColors;
  phase: Phase;
  showCheckFrame: boolean;
  onToggleCheckFrameVisibility: () => void;
}> = ({
  events,
  onClear,
  colors,
  phase,
  showCheckFrame,
  onToggleCheckFrameVisibility,
}) => (
  <View
    style={[
      styles.debugPanel,
      {
        backgroundColor: colors.background.alternative,
        borderColor: colors.border.muted,
      },
    ]}
  >
    <View style={styles.debugHeader}>
      <Text variant={TextVariant.HeadingSm}>
        Check frame debug ({events.length})
      </Text>
      <View style={styles.debugHeaderActions}>
        {phase === 'check' && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onToggleCheckFrameVisibility}
          >
            {showCheckFrame ? 'Hide frame' : 'Show frame'}
          </Button>
        )}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={onClear}
        >
          Clear
        </Button>
      </View>
    </View>
    <View style={styles.debugList}>
      {events.map((event) => (
        <DebugEntry key={event.id} event={event} colors={colors} />
      ))}
    </View>
  </View>
);

const ErrorPanel: React.FC<{
  message: string;
  colors: ThemeColors;
}> = ({ message, colors }) => (
  <View
    style={[
      styles.panel,
      styles.errorPanel,
      { backgroundColor: colors.background.alternative },
    ]}
  >
    <Text variant={TextVariant.HeadingSm} color={TextColor.ErrorDefault}>
      Error
    </Text>
    <Text variant={TextVariant.BodySm}>{message}</Text>
  </View>
);

const MoonpayDemo: React.FC = () => {
  const { colors } = useTheme();

  const {
    phase,
    statusMessage,
    errorMessage,
    email,
    setEmail,
    submission,
    setSubmission,
    debugEvents,
    clearDebug,
    showCheckFrame,
    setShowCheckFrame,
    finalStatus,
    checkFrameUrl,
    authFrameUrl,
    challengeUrl,
    acceptTermsAndCreateSession,
    submitIdentity,
    handleFrameMessage,
    handleChallengeMessage,
    handleCheckFrameError,
    handleAuthFrameError,
    handleChallengeFrameError,
  } = useMoonpayIdentityFlow();

  const {
    resetState,
    resetError,
    resetFrameUrl,
    startReset,
    dismissReset,
    handleResetMessage,
    handleResetError,
  } = useMoonpayReset();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.resetRow}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={startReset}
            isDisabled={resetState === 'resetting'}
          >
            {resetState === 'resetting'
              ? 'Resetting…'
              : 'Reset MoonPay session'}
          </Button>
          {resetState === 'success' && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.SuccessDefault}
              onPress={dismissReset}
            >
              Session cleared
            </Text>
          )}
          {resetState === 'error' && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              onPress={dismissReset}
            >
              {resetError ?? 'Reset failed'}
            </Text>
          )}
        </View>

        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Phase: {phase}
          {statusMessage ? ` — ${statusMessage}` : ''}
        </Text>

        {debugEvents.length > 0 && (
          <DebugPanel
            events={debugEvents}
            onClear={clearDebug}
            colors={colors}
            phase={phase}
            showCheckFrame={showCheckFrame}
            onToggleCheckFrameVisibility={() => setShowCheckFrame((v) => !v)}
          />
        )}

        {phase === 'terms' && (
          <TermsPanel
            email={email}
            onEmailChange={setEmail}
            onAccept={acceptTermsAndCreateSession}
            colors={colors}
          />
        )}

        {phase === 'session' && (
          <LoadingPanel message="Creating session via local UKYC service..." />
        )}

        {phase === 'check' && (
          <LoadingPanel message="Authenticating via Check frame (this is invisible)..." />
        )}

        {phase === 'auth' && (
          <LoadingPanel message="Auth frame visible below — verify your email." />
        )}

        {phase === 'form' && (
          <SubmissionReviewPanel
            submission={submission}
            onChange={setSubmission}
            onSubmit={submitIdentity}
            colors={colors}
          />
        )}

        {phase === 'submit' && <LoadingPanel message={statusMessage} />}

        {phase === 'verify' && <LoadingPanel message={statusMessage} />}

        {phase === 'poll' && <LoadingPanel message={statusMessage} />}

        {phase === 'done' && finalStatus && (
          <DonePanel status={finalStatus} colors={colors} />
        )}

        {phase === 'error' && errorMessage && (
          <ErrorPanel message={errorMessage} colors={colors} />
        )}
      </ScrollView>

      {phase === 'check' && checkFrameUrl && (
        <View style={showCheckFrame ? styles.frameArea : undefined}>
          <MoonpayFrame
            url={checkFrameUrl}
            onMessage={handleFrameMessage}
            onError={handleCheckFrameError}
            invisible={!showCheckFrame}
          />
        </View>
      )}

      {phase === 'auth' && authFrameUrl && (
        <View style={styles.frameArea}>
          <MoonpayFrame
            url={authFrameUrl}
            onMessage={handleFrameMessage}
            onError={handleAuthFrameError}
          />
        </View>
      )}

      {phase === 'challenge' && challengeUrl && (
        <View style={styles.frameArea}>
          <MoonpayFrame
            url={challengeUrl}
            onMessage={handleChallengeMessage}
            onError={handleChallengeFrameError}
          />
        </View>
      )}

      {resetFrameUrl && (
        <MoonpayFrame
          url={resetFrameUrl}
          onMessage={handleResetMessage}
          onError={handleResetError}
          invisible
        />
      )}
    </View>
  );
};

export default MoonpayDemo;
