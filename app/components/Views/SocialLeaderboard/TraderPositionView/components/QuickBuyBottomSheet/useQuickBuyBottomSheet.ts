import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { providerErrors } from '@metamask/rpc-errors';
import type { Position } from '@metamask/social-controllers';
import type { Hex, CaipChainId } from '@metamask/utils';

import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { store } from '../../../../../../store';
import {
  createQuickBuyTransaction,
  ensureQuickBuyTokenRegistered,
} from './createQuickBuyTransaction';
import { useQuickBuySetup } from './useQuickBuySetup';

export interface UseQuickBuyBottomSheetResult {
  bottomSheetRef: React.RefObject<BottomSheetRef>;
  hiddenInputRef: React.RefObject<TextInput>;
  transactionId: string | undefined;
  isSetupLoading: boolean;
  isUnsupportedChain: boolean;
  destChainId: Hex | CaipChainId | undefined;
  destToken: ReturnType<typeof useQuickBuySetup>['destToken'];
  usdAmount: string;
  markConfirmed: () => void;
  handleClose: () => void;
  handlePresetPress: (preset: string) => void;
  handleAmountAreaPress: () => void;
  handleAmountChange: (text: string) => void;
}

const isHexChainId = (value: Hex | CaipChainId | undefined): value is Hex =>
  typeof value === 'string' && value.startsWith('0x');

/**
 * Owns the Quick Buy Pay transaction lifecycle: resolves the destination
 * token, creates an unapproved `quickBuy` transaction once ready (Pay uses
 * this as the anchor for quoting, token selection and fees) and rejects the
 * pending approval if the sheet is dismissed before confirm.
 *
 * The returned `transactionId` is consumed by `QuickBuyTransactionProvider`
 * so Pay hooks resolve against this transaction.
 */
export function useQuickBuyBottomSheet(
  position: Position,
  onClose: () => void,
): UseQuickBuyBottomSheetResult {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const hiddenInputRef = useRef<TextInput>(null);

  const [usdAmount, setUsdAmount] = useState('');
  const [transactionId, setTransactionId] = useState<string | undefined>();
  const isCreatingRef = useRef(false);
  const wasConfirmedRef = useRef(false);

  const {
    chainId: destChainId,
    destToken,
    isLoading: isSetupLoading,
    isUnsupportedChain,
  } = useQuickBuySetup(position);

  // Create the unapproved quickBuy transaction once we know the destination.
  useEffect(() => {
    if (
      transactionId ||
      isCreatingRef.current ||
      !destToken ||
      !isHexChainId(destChainId)
    ) {
      return;
    }

    const fromAddress = selectSelectedInternalAccountAddress(
      store.getState(),
    ) as Hex | undefined;

    if (!fromAddress) {
      return;
    }

    isCreatingRef.current = true;

    (async () => {
      try {
        await ensureQuickBuyTokenRegistered({
          chainId: destChainId,
          tokenAddress: destToken.address as Hex,
          decimals: destToken.decimals ?? 18,
          symbol: destToken.symbol,
          name: destToken.name,
        });

        const { transactionId: newId } = await createQuickBuyTransaction({
          destChainId,
          destTokenAddress: destToken.address as Hex,
          fromAddress,
          amountHex: '0x0',
        });

        setTransactionId(newId);
      } catch (error) {
        Logger.error(error as Error, '[QuickBuy] Failed to create transaction');
      } finally {
        isCreatingRef.current = false;
      }
    })();
  }, [transactionId, destToken, destChainId]);

  // Open the sheet on mount.
  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  // Reject the approval if the sheet unmounts before a confirm.
  useEffect(
    () => () => {
      if (!transactionId || wasConfirmedRef.current) return;

      try {
        Engine.context.ApprovalController.rejectRequest(
          transactionId,
          providerErrors.userRejectedRequest({
            message: 'Quick Buy dismissed by user',
          }),
        );
      } catch (error) {
        Logger.error(
          error as Error,
          '[QuickBuy] Failed to reject pending approval',
        );
      }
    },
    [transactionId],
  );

  const markConfirmed = useCallback(() => {
    wasConfirmedRef.current = true;
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePresetPress = useCallback((preset: string) => {
    setUsdAmount(preset);
  }, []);

  const handleAmountAreaPress = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;
    setUsdAmount(cleaned);
  }, []);

  return useMemo(
    () => ({
      bottomSheetRef,
      hiddenInputRef,
      transactionId,
      isSetupLoading,
      isUnsupportedChain,
      destChainId,
      destToken,
      usdAmount,
      markConfirmed,
      handleClose,
      handlePresetPress,
      handleAmountAreaPress,
      handleAmountChange,
    }),
    [
      transactionId,
      isSetupLoading,
      isUnsupportedChain,
      destChainId,
      destToken,
      usdAmount,
      markConfirmed,
      handleClose,
      handlePresetPress,
      handleAmountAreaPress,
      handleAmountChange,
    ],
  );
}
