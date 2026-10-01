import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  PERPS_CONSTANTS,
  type PerpsPendingManualRecovery,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';

import { PerpsCacheInvalidator } from '../../services/PerpsCacheInvalidator';
import {
  usePerpsRecovery,
  type PerpsRecoveryActivitySnapshot,
} from '../../hooks/usePerpsRecovery';
import { usePerpsRecoveryActions } from '../../hooks/usePerpsRecoveryActions';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import PerpsRecoveryPanel from './PerpsRecoveryPanel';

interface PerpsRecoveryPanelContainerProps {
  readonly symbol?: string;
  readonly providerId?: PerpsProviderType;
}

/**
 * Connects scoped recovery controls to the existing TP/SL navigator and user
 * streams. Market hosts key this owner by market/provider so changing either
 * invalidates an open review. Rows keep their exact local-list references.
 *
 * @param props - Optional displayed market and its known owning provider.
 * @returns Recovery controls for Home or the displayed market.
 */
const PerpsRecoveryPanelContainer = ({
  symbol,
  providerId,
}: PerpsRecoveryPanelContainerProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const activity = usePerpsRecovery();
  const actions = usePerpsRecoveryActions(activity);
  const stream = usePerpsStream();
  const { isCurrent } = activity;
  const { reload } = actions;

  // Initial loading belongs to usePerpsRecovery. Returning from a route refreshes
  // the local list unless the editor already claimed an action before dismissal.
  useEffect(
    () => navigation.addListener('focus', reload),
    [navigation, reload],
  );

  const refreshOwnedStreams = useCallback(
    (snapshot: PerpsRecoveryActivitySnapshot | undefined): void => {
      if (
        snapshot === undefined ||
        !isCurrent(snapshot.context) ||
        Engine.context.PerpsController !== snapshot.controller
      ) {
        return;
      }
      try {
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
        stream.retryOrderStreams();
        stream.positions.clearCache();
        stream.account.clearCache();
        stream.positions.reconnect();
        stream.account.reconnect();
      } catch (error) {
        // A local subscription failure cannot change a settled venue outcome.
        // Existing stream error controls remain responsible for retry guidance.
        Logger.error(
          ensureError(error, 'PerpsRecoveryPanelContainer.refreshOwnedStreams'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'PerpsRecoveryPanelContainer',
              action: 'refresh_user_data',
              provider: snapshot.context.provider,
              network: snapshot.context.network,
            },
          },
        );
      }
    },
    [isCurrent, stream],
  );

  const editProtection = (entry: PerpsPendingManualRecovery): void => {
    const snapshot = activity.captureActivity();
    const params = actions.prepareProtectionEdit(entry);
    if (snapshot === undefined || params === undefined) {
      return;
    }
    navigation.navigate(Routes.PERPS.TPSL, {
      ...params,
      onConfirm: async (...args) => {
        const result = await params.onConfirm(...args);
        if (result?.success) {
          refreshOwnedStreams(snapshot);
        }
        return result;
      },
    });
  };

  const belongsToProvider = (entry: { providerId?: PerpsProviderType }) =>
    providerId === undefined ||
    entry.providerId === undefined ||
    entry.providerId === providerId;
  const visibleActivity = {
    ...activity,
    dispatches: activity.dispatches.filter(belongsToProvider),
    protections: activity.protections.filter(
      (entry) =>
        belongsToProvider(entry) &&
        (symbol === undefined || entry.symbol === symbol),
    ),
  };

  return (
    <PerpsRecoveryPanel
      activity={visibleActivity}
      isActionPending={actions.isActionPending}
      actionError={actions.actionError}
      review={actions.review}
      canReview={actions.canReview}
      canEditProtection={actions.canEditProtection}
      canRemoveProtection={actions.canRemoveProtection}
      onReload={actions.reload}
      onCheckStatus={actions.checkStatus}
      onReview={actions.reviewEntry}
      onAcknowledge={async (entry) => {
        const snapshot = activity.captureActivity();
        if (await actions.acknowledge(entry)) {
          refreshOwnedStreams(snapshot);
        }
      }}
      onEditProtection={editProtection}
      onRemoveProtection={async (entry) => {
        const snapshot = activity.captureActivity();
        if ((await actions.removeProtection(entry)).success) {
          refreshOwnedStreams(snapshot);
        }
      }}
    />
  );
};

export default PerpsRecoveryPanelContainer;
