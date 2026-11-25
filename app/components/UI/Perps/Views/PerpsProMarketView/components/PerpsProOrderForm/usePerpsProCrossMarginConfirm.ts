import type { MarginMode } from '@metamask/perps-controller';
import { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPerpsCrossMarginConfirmed } from '../../../../../../../actions/settings';
import { selectHasConfirmedCrossMargin } from '../../../../selectors/crossMarginConfirmation';
import { selectPerpsSelectedAccountAddress } from '../../../../selectors/selectedAccountAddress';

interface UsePerpsProCrossMarginConfirmParams {
  marginMode: MarginMode;
  onMarginModeSelect: (marginMode: MarginMode) => void;
}

export interface UsePerpsProCrossMarginConfirmResult {
  isCrossConfirmVisible: boolean;
  /** Routes a margin mode picked in the margin mode sheet. */
  onMarginModeSelect: (marginMode: MarginMode) => void;
  /** Call once the margin mode sheet has closed. */
  onMarginModeSheetClosed: () => void;
  closeCrossConfirm: () => void;
  confirmCrossMargin: () => void;
}

/**
 * Gates the first switch to Cross behind the risk confirmation sheet.
 * Confirm is remembered per account, so later Cross selections on any market
 * skip the sheet. Going back leaves the account unconfirmed.
 */
export const usePerpsProCrossMarginConfirm = ({
  marginMode,
  onMarginModeSelect,
}: UsePerpsProCrossMarginConfirmParams): UsePerpsProCrossMarginConfirmResult => {
  const dispatch = useDispatch();
  const hasConfirmedCrossMargin = useSelector(selectHasConfirmedCrossMargin);
  const selectedAccountAddress = useSelector(selectPerpsSelectedAccountAddress);

  // The confirm sheet opens once the margin mode sheet has finished closing,
  // so the request is held until then together with the account that made it.
  const pendingCrossRequestRef = useRef<{
    accountAddress: string | undefined;
  } | null>(null);
  const [isCrossConfirmVisible, setIsCrossConfirmVisible] = useState(false);
  // Confirming must acknowledge the account that asked for Cross, never one
  // selected while the sheet was open, so an account switch closes the sheet.
  const [confirmAccountAddress, setConfirmAccountAddress] = useState(
    selectedAccountAddress,
  );

  if (selectedAccountAddress !== confirmAccountAddress) {
    setConfirmAccountAddress(selectedAccountAddress);
    if (isCrossConfirmVisible) {
      setIsCrossConfirmVisible(false);
    }
  }

  const handleMarginModeSelect = useCallback(
    (nextMarginMode: MarginMode) => {
      if (
        nextMarginMode === 'cross' &&
        marginMode !== 'cross' &&
        !hasConfirmedCrossMargin
      ) {
        pendingCrossRequestRef.current = {
          accountAddress: selectedAccountAddress,
        };
        return;
      }
      onMarginModeSelect(nextMarginMode);
    },
    [
      hasConfirmedCrossMargin,
      marginMode,
      onMarginModeSelect,
      selectedAccountAddress,
    ],
  );

  const onMarginModeSheetClosed = useCallback(() => {
    const pendingRequest = pendingCrossRequestRef.current;
    pendingCrossRequestRef.current = null;
    if (
      pendingRequest &&
      pendingRequest.accountAddress === selectedAccountAddress
    ) {
      setIsCrossConfirmVisible(true);
    }
  }, [selectedAccountAddress]);

  const closeCrossConfirm = useCallback(
    () => setIsCrossConfirmVisible(false),
    [],
  );

  const confirmCrossMargin = useCallback(() => {
    setIsCrossConfirmVisible(false);
    if (confirmAccountAddress) {
      dispatch(setPerpsCrossMarginConfirmed(confirmAccountAddress));
    }
    onMarginModeSelect('cross');
  }, [confirmAccountAddress, dispatch, onMarginModeSelect]);

  return {
    isCrossConfirmVisible,
    onMarginModeSelect: handleMarginModeSelect,
    onMarginModeSheetClosed,
    closeCrossConfirm,
    confirmCrossMargin,
  };
};
