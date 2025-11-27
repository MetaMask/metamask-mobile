import { useMemo } from 'react';
import { Linking } from 'react-native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { CaipAssetType } from '@metamask/utils';
import {
  PointsEventDto,
  SwapEventPayload,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useTransactionExplorer } from './useTransactionExplorer';
import { strings } from '../../../../../locales/i18n';
import { ModalAction } from '../components/RewardsBottomSheetModal';

/**
 * Derives the bottom sheet confirm action for a given rewards activity event.
 * - SWAP: "View on <explorer>" linking to the transaction
 * - Others: undefined (caller should apply default Close action)
 */
export const useActivityDetailsConfirmAction = (
  event: PointsEventDto,
): ModalAction | undefined => {
  const isSwap = event.type === 'SWAP';

  const explorerInfo = useTransactionExplorer(
    isSwap
      ? ((event.payload as SwapEventPayload)?.srcAsset?.type as
          | CaipAssetType
          | undefined)
      : undefined,
    isSwap ? (event.payload as SwapEventPayload)?.txHash : undefined,
  );

  return useMemo(() => {
    if (isSwap && explorerInfo) {
      return {
        label: `${strings('transactions.view_on')} ${explorerInfo.name}`,
        onPress: () => Linking.openURL(explorerInfo.url),
        variant: ButtonVariant.Secondary,
      } as ModalAction;
    }
    return undefined;
  }, [isSwap, explorerInfo]);
};

export default useActivityDetailsConfirmAction;
