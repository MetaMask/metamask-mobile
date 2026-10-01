import React, { useState } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  formatPerpsFiat,
  formatPositionSize,
  type Order,
  type PerpsPendingManualRecovery,
  type PerpsProviderType,
  type PerpsRecoveredDispatch,
  type Position,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import type { usePerpsRecovery } from '../../hooks/usePerpsRecovery';
import { PerpsRecoveryPanelTestIds as IDs } from './PerpsRecoveryPanel.testIds';
import { formatOrderTypeLabel } from '../../utils/orderUtils';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';

export type PerpsRecoveryEntry =
  | PerpsRecoveredDispatch
  | PerpsPendingManualRecovery;

export interface PerpsRecoveryVenueSnapshot {
  readonly entry: PerpsRecoveryEntry;
  readonly providerId: PerpsProviderType;
  readonly positions: readonly Position[];
  readonly orders: readonly Order[];
}

export interface PerpsRecoveryPanelProps {
  readonly activity: Pick<
    ReturnType<typeof usePerpsRecovery>,
    | 'dispatches'
    | 'protections'
    | 'hasLoaded'
    | 'isAvailable'
    | 'isLoading'
    | 'error'
  >;
  readonly isActionPending: boolean;
  readonly actionError?:
    | 'review'
    | 'acknowledge'
    | 'resolve'
    | 'unresolved'
    | 'unsupported';
  readonly review?: PerpsRecoveryVenueSnapshot;
  readonly canReview: (entry: PerpsRecoveryEntry) => boolean;
  readonly canEditProtection: (entry: PerpsPendingManualRecovery) => boolean;
  readonly canRemoveProtection: (entry: PerpsPendingManualRecovery) => boolean;
  readonly onReload: () => void;
  readonly onCheckStatus: () => void;
  readonly onReview: (entry: PerpsRecoveryEntry) => void;
  readonly onAcknowledge: (entry: PerpsRecoveredDispatch) => void;
  readonly onEditProtection: (entry: PerpsPendingManualRecovery) => void;
  readonly onRemoveProtection: (entry: PerpsPendingManualRecovery) => void;
}

/** Format validated venue quantities while retaining unknown data as unavailable. */
const formatRecoverySize = (size: string): string =>
  size.trim() !== '' && Number.isFinite(Number(size))
    ? formatPositionSize(size)
    : PERPS_CONSTANTS.FallbackDataDisplay;

const VenueSnapshot = ({ review }: { review: PerpsRecoveryVenueSnapshot }) => (
  <Box gap={2} testID={IDs.VENUE}>
    <Text variant={TextVariant.BodyMd}>
      {strings('perps.recovery.venue_review', {
        provider: PROVIDER_DISPLAY_INFO[review.providerId].name,
      })}
    </Text>
    <Text variant={TextVariant.BodySm}>
      {strings('perps.recovery.positions_count', {
        count: review.positions.length,
      })}
    </Text>
    {review.positions.map((position, index) => (
      <Text
        key={`${position.symbol}:${index}`}
        testID={IDs.POSITION}
        variant={TextVariant.BodySm}
      >
        {strings('perps.recovery.position_summary', {
          symbol: position.symbol,
          size: formatRecoverySize(position.size),
          price: formatPerpsFiat(position.entryPrice),
        })}
      </Text>
    ))}
    <Text variant={TextVariant.BodySm}>
      {strings('perps.recovery.orders_count', { count: review.orders.length })}
    </Text>
    {review.orders.map((order) => (
      <Text key={order.orderId} testID={IDs.ORDER} variant={TextVariant.BodySm}>
        {strings('perps.recovery.order_summary', {
          symbol: order.symbol,
          side: strings(`perps.recovery.${order.side}`),
          type: formatOrderTypeLabel(order),
          size: formatRecoverySize(order.remainingSize),
          price: formatPerpsFiat(order.triggerPrice ?? order.price),
        })}
      </Text>
    ))}
  </Box>
);

/**
 * Presents interrupted trading activity without exposing recovery identifiers,
 * trading-key slots or internal failure messages. The owner supplies fenced
 * action authority and a strict venue snapshot for the exact selected entry.
 * A failed refresh retains known rows, and pending dispatches cannot acknowledge.
 *
 * @param props - Current scoped activity and explicit recovery controls.
 * @returns Recovery controls for known activity, or no panel for empty reads.
 */
const PerpsRecoveryPanel = ({
  activity,
  isActionPending,
  actionError,
  review,
  canReview,
  canEditProtection,
  canRemoveProtection,
  onReload,
  onCheckStatus,
  onReview,
  onAcknowledge,
  onEditProtection,
  onRemoveProtection,
}: PerpsRecoveryPanelProps) => {
  const [removal, setRemoval] = useState<PerpsPendingManualRecovery>();
  const busy = activity.isLoading || isActionPending;
  const unavailable = !activity.isAvailable;
  const failed = activity.error !== undefined;
  const actionsAvailable = !busy && !unavailable && !failed;
  const isEmpty =
    activity.dispatches.length === 0 && activity.protections.length === 0;

  if (isEmpty && actionError === undefined) {
    return null;
  }

  return (
    <Box padding={4} gap={3} testID={IDs.PANEL}>
      <Text variant={TextVariant.HeadingSm}>
        {strings('perps.recovery.title')}
      </Text>
      {unavailable ? (
        <BannerAlert
          testID={IDs.UNAVAILABLE}
          severity={BannerAlertSeverity.Warning}
          description={strings('perps.recovery.unavailable')}
        />
      ) : activity.isLoading ? (
        <Text testID={IDs.LOADING} variant={TextVariant.BodySm}>
          {strings('perps.recovery.loading')}
        </Text>
      ) : null}
      {failed && (
        <BannerAlert
          testID={IDs.ERROR}
          severity={BannerAlertSeverity.Warning}
          description={strings('perps.recovery.refresh_error')}
        />
      )}
      {actionError !== undefined && (
        <BannerAlert
          testID={IDs.ACTION_ERROR}
          severity={BannerAlertSeverity.Warning}
          description={strings(`perps.recovery.${actionError}_error`)}
        />
      )}
      {failed ? (
        <Button
          testID={IDs.RETRY}
          variant={ButtonVariant.Secondary}
          isDisabled={busy || unavailable}
          onPress={onReload}
        >
          {strings('perps.recovery.retry')}
        </Button>
      ) : (
        <Button
          testID={IDs.CHECK_STATUS}
          variant={ButtonVariant.Secondary}
          isDisabled={busy || unavailable}
          onPress={onCheckStatus}
        >
          {strings('perps.recovery.check_status')}
        </Button>
      )}
      {activity.dispatches.map((entry) => (
        <Box key={entry.recoveryId} gap={2} testID={IDs.DISPATCH}>
          <Text variant={TextVariant.BodyMd}>
            {strings(
              entry.acknowledgeable !== false
                ? `perps.recovery.outcome_${entry.outcome}`
                : 'perps.recovery.pending',
            )}
          </Text>
          <Button
            testID={IDs.REVIEW}
            variant={ButtonVariant.Secondary}
            isDisabled={!actionsAvailable || !canReview(entry)}
            onPress={() => onReview(entry)}
          >
            {strings('perps.recovery.review')}
          </Button>
          {review?.entry === entry && (
            <>
              <VenueSnapshot review={review} />
              {entry.acknowledgeable !== false && (
                <Button
                  testID={IDs.ACKNOWLEDGE}
                  isDisabled={!actionsAvailable || !canReview(entry)}
                  onPress={() => onAcknowledge(entry)}
                >
                  {strings('perps.recovery.confirm_review')}
                </Button>
              )}
            </>
          )}
        </Box>
      ))}
      {activity.protections.map((entry) => (
        <Box key={entry.settlementKey} gap={2} testID={IDs.PROTECTION}>
          <Text variant={TextVariant.BodyMd}>
            {strings('perps.recovery.protection', { symbol: entry.symbol })}
          </Text>
          <Button
            testID={IDs.REVIEW}
            variant={ButtonVariant.Secondary}
            isDisabled={!actionsAvailable || !canReview(entry)}
            onPress={() => onReview(entry)}
          >
            {strings('perps.recovery.review')}
          </Button>
          {review?.entry === entry && (
            <>
              <VenueSnapshot review={review} />
              <Button
                testID={IDs.EDIT_PROTECTION}
                variant={ButtonVariant.Secondary}
                isDisabled={!actionsAvailable || !canEditProtection(entry)}
                onPress={() => onEditProtection(entry)}
              >
                {strings('perps.recovery.edit_protection')}
              </Button>
              {removal === entry ? (
                <>
                  <BannerAlert
                    testID={IDs.REMOVAL_WARNING}
                    severity={BannerAlertSeverity.Warning}
                    description={strings('perps.recovery.removal_warning')}
                  />
                  <Button
                    testID={IDs.CONFIRM_REMOVAL}
                    isDisabled={
                      !actionsAvailable || !canRemoveProtection(entry)
                    }
                    onPress={() => {
                      setRemoval(undefined);
                      onRemoveProtection(entry);
                    }}
                  >
                    {strings('perps.recovery.confirm_removal')}
                  </Button>
                  <Button
                    testID={IDs.CANCEL_REMOVAL}
                    variant={ButtonVariant.Tertiary}
                    isDisabled={busy}
                    onPress={() => setRemoval(undefined)}
                  >
                    {strings('perps.recovery.cancel')}
                  </Button>
                </>
              ) : (
                <Button
                  testID={IDs.REMOVE_PROTECTION}
                  variant={ButtonVariant.Secondary}
                  isDisabled={!actionsAvailable || !canRemoveProtection(entry)}
                  onPress={() => setRemoval(entry)}
                >
                  {strings('perps.recovery.remove_protection')}
                </Button>
              )}
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default PerpsRecoveryPanel;
