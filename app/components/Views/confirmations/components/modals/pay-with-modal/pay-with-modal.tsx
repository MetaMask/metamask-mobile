import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AssetType } from '../../../types/token';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { getAvailableTokens } from '../../../utils/transaction-pay';
import { useRoute, RouteProp } from '@react-navigation/native';

/**
 * Route params for PayWithModal
 */
interface PayWithModalRouteParams {
  /**
   * Optional map of allowed token addresses by chain ID.
   * When provided, only tokens matching these addresses will be shown.
   * Format: { [chainId: string]: string[] }
   */
  allowedTokenAddresses?: {
    [chainId: string]: string[];
  };
}

export function PayWithModal() {
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const route =
    useRoute<RouteProp<Record<string, PayWithModalRouteParams>, string>>();
  const allowedTokenAddresses = route.params?.allowedTokenAddresses;

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTokenSelect = useCallback(
    (token: AssetType) => {
      setPayToken({
        address: token.address as Hex,
        chainId: token.chainId as Hex,
      });

      handleClose();
    },
    [handleClose, setPayToken],
  );

  const tokenFilter = useCallback(
    (tokens: AssetType[]) =>
      getAvailableTokens({
        payToken,
        requiredTokens,
        tokens,
        allowedTokenAddresses,
      }),
    [payToken, requiredTokens, allowedTokenAddresses],
  );

  return (
    <BottomSheet isFullscreen ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('pay_with_modal.title')}
      </BottomSheetHeader>
      <Asset
        includeNoBalance
        hideNfts
        tokenFilter={tokenFilter}
        onTokenSelect={handleTokenSelect}
      />
    </BottomSheet>
  );
}
