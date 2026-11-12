import React, { useEffect, useState } from 'react';
import { Box, Button, ButtonVariant, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import type { PredictVenueId } from '../../../types';
import type { PredictOrderRecoveryItem, PredictOrderServiceRecoveryChangedEvent } from '../../../services/PredictOrderService';

/** Pending financial outcomes survive restart. This affordance can only
 * refresh observations; it never opens an approval or submits an Order. */
export const PortfolioRecoveryPanel = ({ venueId }: { venueId: PredictVenueId }) => {
  const [operations, setOperations] = useState<readonly PredictOrderRecoveryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const listener = (payload: PredictOrderServiceRecoveryChangedEvent['payload'][0]) => {
      if (payload.venueId === venueId) {
        setOperations(payload.operations);
      }
    };
    Engine.controllerMessenger.subscribe('PredictOrderService:recoveryChanged', listener);
    setOperations(Engine.controllerMessenger.call('PredictOrderService:getRecovery', venueId) ?? []);
    return () => Engine.controllerMessenger.unsubscribe('PredictOrderService:recoveryChanged', listener);
  }, [venueId]);
  if (operations.length === 0) {
    return null;
  }
  const manual = operations.every((operation) => operation.status === 'needs_manual_review');
  return (
    <Box twClassName="rounded-xl bg-alternative p-4 mb-3" testID="predict-recovery-panel">
      <Text variant={TextVariant.BodyMd}>
        {strings(manual ? 'predict_next.order_receipt.needs_review_title' : 'predict_next.order_receipt.reconciling_title')}
      </Text>
      <Text variant={TextVariant.BodySm}>
        {strings(manual ? 'predict_next.order_receipt.needs_review_description' : 'predict_next.order_receipt.reconciling_description')}
      </Text>
      {!manual && (
        <Button
          variant={ButtonVariant.Tertiary}
          isDisabled={refreshing}
          testID="predict-recovery-refresh"
          onPress={() => {
            setRefreshing(true);
            Engine.controllerMessenger.call('PredictOrderService:refreshRecovery', venueId)
              .catch(() => undefined)
              .finally(() => setRefreshing(false));
          }}
        >
          {strings('predict_next.order_receipt.keep_checking')}
        </Button>
      )}
    </Box>
  );
};
