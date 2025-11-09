import React, { useCallback, useRef } from 'react';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { strings } from '../../../../../../../locales/i18n';
import { Asset } from '../../send/asset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AssetType, TokenStandard } from '../../../types/token';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { BigNumber } from 'bignumber.js';
import { getNativeTokenAddress } from '../../../utils/asset';

export function PayWithModal() {
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

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

  const getAvailableTokens = useCallback(
    (tokens: AssetType[]) =>
      tokens
        .filter((token) => {
          if (
            token.standard !== TokenStandard.ERC20 ||
            !token.accountType?.includes('eip155')
          ) {
            return false;
          }

          const isSelected =
            payToken?.address.toLowerCase() === token.address.toLowerCase() &&
            payToken?.chainId === token.chainId;

          if (isSelected) {
            return true;
          }

          const isRequiredToken = requiredTokens.some(
            (t) =>
              t.address.toLowerCase() === token.address.toLowerCase() &&
              t.chainId === token.chainId,
          );

          if (isRequiredToken) {
            return true;
          }

          return new BigNumber(token.balance).gt(0);
        })
        .map((token) => {
          const isSelected =
            payToken?.address.toLowerCase() === token.address.toLowerCase() &&
            payToken?.chainId === token.chainId;

          const nativeTokenAddress = getNativeTokenAddress(
            token.chainId as Hex,
          );

          const nativeToken = tokens.find(
            (t) =>
              t.address === nativeTokenAddress && t.chainId === token.chainId,
          );

          const disabled = new BigNumber(nativeToken?.balance ?? 0).isZero();

          const disabledMessage = disabled
            ? strings('pay_with_modal.no_gas')
            : undefined;

          return {
            ...token,
            disabled,
            disabledMessage,
            isSelected,
          };
        }),
    [payToken, requiredTokens],
  );

  return (
    <BottomSheet isFullscreen ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {strings('pay_with_modal.title')}
      </BottomSheetHeader>
      <Asset
        includeNoBalance
        hideNfts
        tokenFilter={getAvailableTokens}
        onTokenSelect={handleTokenSelect}
      />
    </BottomSheet>
  );
}
