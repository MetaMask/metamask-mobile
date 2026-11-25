import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import type { AccountReadinessValue } from '../../../onboarding/accountReadiness.types';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { AccountReadinessReadStatus } from './AccountReadinessReadStatus';
import { AccountSetupActionRequiredBanner } from './AccountSetupActionRequiredBanner';
import { FinishVerifyingBanner } from './FinishVerifyingBanner';
import { GetStartedBanner } from './GetStartedBanner';
import { IdentityVerifiedBanner } from './IdentityVerifiedBanner';
import { VerificationPendingBanner } from './VerificationPendingBanner';

const ANNOUNCEMENT_KEY = {
  not_started: 'predict_next.get_started_banner.title',
  finish_verifying: 'predict_next.account_readiness.finish_verifying.title',
  verifying: 'predict_next.account_readiness.verifying.title',
  verified: 'predict_next.account_readiness.verified.title',
  action_required: 'predict_next.account_readiness.activation_required.title',
} as const;

interface AccountReadinessCardHostProps {
  value: AccountReadinessValue;
}

/**
 * Home's one readiness slot, rendered directly under Balance Summary. It
 * never starts setup on its own; every card action is a user press.
 */
export const AccountReadinessCardHost = ({
  value,
}: AccountReadinessCardHostProps) => {
  const {
    readiness,
    card,
    connection,
    setup,
    readError,
    latency,
    isRefreshing,
  } = value;
  const lastAnnounced = useRef<string | null>(null);
  const announcementKey =
    card.kind === 'hidden'
      ? null
      : card.kind === 'action_required'
        ? `${card.kind}:${card.reason}`
        : card.kind;

  useEffect(() => {
    if (
      card.kind === 'hidden' ||
      announcementKey === null ||
      lastAnnounced.current === announcementKey
    ) {
      return;
    }
    lastAnnounced.current = announcementKey;
    AccessibilityInfo.announceForAccessibility(
      strings(ANNOUNCEMENT_KEY[card.kind]),
    );
  }, [announcementKey, card.kind]);

  // Opening and known-offline are intrinsic control states, not card variants.
  const isDisabled = setup !== 'closed' || connection === 'offline';
  let content: React.ReactNode = null;
  switch (card.kind) {
    case 'not_started':
      content = (
        <GetStartedBanner
          isDisabled={isDisabled}
          onPress={() => value.startSetup()}
        />
      );
      break;
    case 'finish_verifying':
      content = (
        <FinishVerifyingBanner
          isDisabled={isDisabled}
          onPress={() => value.startSetup()}
        />
      );
      break;
    case 'verifying':
      content = <VerificationPendingBanner />;
      break;
    case 'verified':
      content =
        readiness === 'ready' ? (
          <IdentityVerifiedBanner onDismiss={() => value.dismissVerified()} />
        ) : null;
      break;
    case 'action_required':
      content = (
        <AccountSetupActionRequiredBanner
          intent={card.intent}
          isDisabled={isDisabled}
          onPress={() => value.retrySetup()}
          reason={card.reason}
        />
      );
      break;
    default:
      content = null;
  }

  const showReadStatus =
    readError === 'unavailable' ||
    connection === 'offline' ||
    latency === 'slow';

  if (!content && !showReadStatus) {
    return null;
  }

  return (
    <Box gap={2} testID={PredictHomeTestIds.ACCOUNT_READINESS}>
      {content}
      {showReadStatus ? (
        <AccountReadinessReadStatus
          connection={connection}
          isRefreshing={isRefreshing}
          onRefresh={() => value.refreshStatus()}
          readError={readError}
        />
      ) : null}
    </Box>
  );
};
