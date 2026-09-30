import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { GachaPurchaseSheetTestIds } from '../../Gacha.testIds';
import type {
  CollectorCryptPack,
  SolanaAccountRef,
} from '../../providers/collector-crypt/types';
import { formatUsdcAmount } from '../../providers/collector-crypt/utils/format';
import { getErrorMessageFromUnknown } from '../../providers/collector-crypt/utils/errorMessages';
import CtaButton from '../CtaButton';
import UsdcAmount, { UsdcIcon } from '../UsdcAmount';
import {
  canAffordPack,
  getPackPriceBaseUnits,
} from '../PackCard/PackCard.utils';

/** "5eyk…Kvdp". */
export const shortenAddress = (address: string): string =>
  address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;

export interface PackPurchaseSheetProps {
  pack: CollectorCryptPack;
  account: SolanaAccountRef;
  /** USDC balance in base units. */
  balance: bigint;
  /** Called once the sheet is closed, whatever the reason. */
  onClose: () => void;
  /** Called after the sheet closed, with the memo of the generated pack. */
  onPurchased: (memo: string) => void;
}

/**
 * Purchase confirmation. Required because the payment is signed silently by
 * the Solana Snap once `completePack` runs.
 */
const PackPurchaseSheet = ({
  pack,
  account,
  balance,
  onClose,
  onPurchased,
}: PackPurchaseSheetProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const price = getPackPriceBaseUnits(pack.price);
  const balanceAfter = balance > price ? balance - price : 0n;
  const isAffordable = canAffordPack(balance, pack.price);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, [isSubmitting]);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const memo = await Engine.context.GachaController.generatePack({
        account,
        pack: { code: pack.code, name: pack.name, price: pack.price },
      });
      sheetRef.current?.onCloseBottomSheet(() => onPurchased(memo));
    } catch (error) {
      setErrorMessage(getErrorMessageFromUnknown(error));
      setIsSubmitting(false);
    }
  }, [account, pack, onPurchased]);

  return (
    <Box pointerEvents="box-none" twClassName="absolute h-0 w-0">
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView style={tw.style('flex-1')}>
            <BottomSheet
              ref={sheetRef}
              onClose={onClose}
              isInteractable={!isSubmitting}
              testID={GachaPurchaseSheetTestIds.SHEET}
            >
              <BottomSheetHeader
                onClose={handleClose}
                closeButtonProps={{
                  testID: GachaPurchaseSheetTestIds.CLOSE_BUTTON,
                  isDisabled: isSubmitting,
                }}
              >
                {strings('gacha.purchase.title')}
              </BottomSheetHeader>
              <Box twClassName="px-4 pb-4" gap={4}>
                <Box>
                  <KeyValueRow
                    keyLabel={strings('gacha.purchase.pack')}
                    value={pack.name}
                  />
                  <KeyValueRow
                    keyLabel={strings('gacha.purchase.price')}
                    value={<UsdcAmount amount={formatUsdcAmount(price)} />}
                  />
                  <KeyValueRow
                    keyLabel={strings('gacha.purchase.pay_with')}
                    value={
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        gap={1}
                      >
                        <UsdcIcon />
                        <Text variant={TextVariant.BodyMd}>
                          {strings('gacha.balance_available', {
                            amount: formatUsdcAmount(balance),
                          })}
                        </Text>
                      </Box>
                    }
                  />
                  <KeyValueRow
                    keyLabel={strings('gacha.purchase.balance_after')}
                    value={strings('gacha.usdc_amount', {
                      amount: formatUsdcAmount(balanceAfter),
                    })}
                    valueTextProps={{
                      testID: GachaPurchaseSheetTestIds.BALANCE_AFTER,
                    }}
                  />
                  <KeyValueRow
                    keyLabel={strings('gacha.purchase.account')}
                    value={shortenAddress(account.address)}
                  />
                </Box>
                <Box gap={2}>
                  {pack.instantBuybackPercent > 0 && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings('gacha.purchase.buyback_info', {
                        percent: pack.instantBuybackPercent,
                      })}
                    </Text>
                  )}
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings('gacha.purchase.signing_info')}
                  </Text>
                </Box>
                {errorMessage ? (
                  <BannerAlert
                    severity={BannerAlertSeverity.Danger}
                    description={errorMessage}
                    testID={GachaPurchaseSheetTestIds.ERROR}
                  />
                ) : null}
                <CtaButton
                  label={strings('gacha.purchase.confirm')}
                  loadingText={strings('gacha.purchase.generating')}
                  isLoading={isSubmitting}
                  isDisabled={!isAffordable}
                  onPress={handleConfirm}
                  testID={GachaPurchaseSheetTestIds.CONFIRM_BUTTON}
                />
              </Box>
            </BottomSheet>
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </Box>
  );
};

export default PackPurchaseSheet;
