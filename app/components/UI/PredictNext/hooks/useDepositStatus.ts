import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { PredictFundingServiceDepositStatusChangedEvent } from '../services/PredictFundingService';
import type { PredictDepositOperation, PredictVenueId } from '../types';

const isOneTimeNotice = (
  deposit: PredictDepositOperation | null,
): deposit is PredictDepositOperation =>
  deposit?.status === 'failed' || deposit?.status === 'cancelled';

const isOpenDeposit = (deposit: PredictDepositOperation | null): boolean =>
  deposit?.status === 'awaiting_transfer' ||
  deposit?.status === 'processing' ||
  deposit?.status === 'under_review';

const readDepositStatus = (
  venueId: PredictVenueId,
): PredictDepositOperation | null => {
  try {
    return (
      Engine.controllerMessenger.call(
        'PredictFundingService:getDepositStatus',
        venueId,
      ) ?? null
    );
  } catch {
    return null;
  }
};

const acknowledgeNotice = (
  venueId: PredictVenueId,
  operationId: string,
): void => {
  try {
    Engine.controllerMessenger.call(
      'PredictFundingService:acknowledgeDepositNotice',
      venueId,
      operationId,
    );
  } catch {
    // Ignore when the service is unavailable (for example on a non-Kalshi Venue).
  }
};

/**
 * Subscribes to `PredictFundingService`'s active deposit status for `venueId`.
 *
 * Open statuses (`awaiting_transfer`, `processing`, `under_review`) remain
 * visible while open. One-time terminal notices (`failed`, `cancelled`) are
 * acknowledged on the first focused surface that displays them and cleared
 * when that surface loses focus or unmounts, so they are shown once and then
 * removed.
 */
export const useDepositStatus = (
  venueId: PredictVenueId,
): PredictDepositOperation | null => {
  const isFocused = useIsFocused();
  const [serviceDeposit, setServiceDeposit] =
    useState<PredictDepositOperation | null>(() => readDepositStatus(venueId));
  const [shownNotice, setShownNotice] =
    useState<PredictDepositOperation | null>(null);
  const acknowledgedRef = useRef<string | null>(null);
  const wasFocusedRef = useRef(isFocused);

  useEffect(() => {
    const listener = (
      payload: PredictFundingServiceDepositStatusChangedEvent['payload'][0],
    ) => {
      if (payload.venueId === venueId) {
        setServiceDeposit(payload.deposit);
      }
    };
    Engine.controllerMessenger.subscribe(
      'PredictFundingService:depositStatusChanged',
      listener,
    );
    setServiceDeposit(readDepositStatus(venueId));
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'PredictFundingService:depositStatusChanged',
        listener,
      );
    };
  }, [venueId]);

  useEffect(() => {
    if (isOpenDeposit(serviceDeposit)) {
      setShownNotice(null);
      return;
    }
    if (isFocused && isOneTimeNotice(serviceDeposit)) {
      const noticeKey = `${serviceDeposit.operationId}:${serviceDeposit.status}`;
      setShownNotice(serviceDeposit);
      if (acknowledgedRef.current !== noticeKey) {
        acknowledgedRef.current = noticeKey;
        acknowledgeNotice(venueId, serviceDeposit.operationId);
      }
    }
  }, [isFocused, serviceDeposit, venueId]);

  useEffect(() => {
    if (wasFocusedRef.current && !isFocused) {
      setShownNotice(null);
    }
    wasFocusedRef.current = isFocused;
  }, [isFocused]);

  if (isOpenDeposit(serviceDeposit)) {
    return serviceDeposit;
  }
  if (shownNotice) {
    return shownNotice;
  }
  if (isFocused && isOneTimeNotice(serviceDeposit)) {
    return serviceDeposit;
  }
  return null;
};
