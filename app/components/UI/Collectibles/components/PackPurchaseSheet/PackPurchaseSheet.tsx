import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  IconName,
  FontWeight,
  KeyValueRow,
  Text,
  TextVariant,
  TextColor,
  Switch,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesPurchaseSheetTestIds } from '../../Collectibles.testIds';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import type {
  CollectiblesPack,
  CollectiblesWalletAccount,
  CollectiblesPurchaseOptions,
} from '../../types';
import { getErrorMessageFromUnknown } from '../../providers/pack-partner/utils/errorMessages';
import CtaButton from '../CtaButton';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import QuantitySelector from './QuantitySelector';
import { UsdcIcon } from '../UsdcAmount';
import PackQuantityPresets from './PackQuantityPresets';
import {
  formatPurchaseAmount,
  getMaximumAffordableQuantity,
  normalizePurchaseQuantity,
} from './packPurchaseAmounts';
import { useSkipRevealsPreference } from './useSkipRevealsPreference';
import CollectiblesSheetModal from '../CollectiblesSheetModal/CollectiblesSheetModal';

export interface PurchaseRevealOptions {
  /** Presentation only: payment and pack opening still complete before results. */
  skipReveal?: boolean;
}

export interface PackPurchaseSheetProps {
  pack: CollectiblesPack;
  account: CollectiblesWalletAccount;
  /** USDC balance in base units. */
  balance: bigint;
  /** Called once the sheet is closed, whatever the reason. */
  onClose: () => void;
  /** Called after the sheet closed, with the memo of the generated pack. */
  onPurchased: (memo: string, options?: PurchaseRevealOptions) => void;
  initialOptions?: CollectiblesPurchaseOptions;
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
  initialOptions,
}: PackPurchaseSheetProps) => {
  const tw = useTailwind();
  const online = useNetworkTier() !== 'NONE';
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetRef>(null);
  const submissionInFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(
    normalizePurchaseQuantity(initialOptions?.quantity),
  );
  const [turbo, setTurbo] = useState(initialOptions?.turbo ?? false);
  const { skipReveal, updateSkipReveal, saveFailed } =
    useSkipRevealsPreference();
  const unitPrice = BigInt(pack.priceAmount);
  const price = unitPrice * BigInt(quantity);
  const amount = formatPurchaseAmount(price);
  const maximumAffordable = getMaximumAffordableQuantity(balance, unitPrice);
  const isAffordable = balance >= price;
  const artwork = getCollectiblesPackArtwork(`pack_partner:${pack.code}`);
  const displayName = artwork.name ?? pack.name;
  // Replit uses a price-first review, without duplicating the pack artwork.
  // The native sheet adds its own grab handle and bottom safe area.
  const contentHeight =
    Math.min(height * 0.88, height - insets.top) - insets.bottom - 12;
  const amountFontSize = Math.min(
    amount.length > 10 ? 32 : amount.length > 7 ? 48 : 64,
    height * 0.88 * 0.08,
  );

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    if (!submissionInFlight.current) {
      sheetRef.current?.onCloseBottomSheet();
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (submissionInFlight.current || !isAffordable || !online) {
      return;
    }
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const memo = await Engine.context.CollectiblesController.generatePack({
        account,
        pack: {
          code: pack.code,
          name: pack.name,
          price: pack.price,
          priceAmount: pack.priceAmount,
        },
        options: { quantity, turbo },
      });
      sheetRef.current?.onCloseBottomSheet(() =>
        onPurchased(memo, { skipReveal }),
      );
    } catch (error) {
      submissionInFlight.current = false;
      setErrorMessage(getErrorMessageFromUnknown(error));
      setIsSubmitting(false);
    }
  }, [
    account,
    isAffordable,
    online,
    onPurchased,
    pack,
    quantity,
    turbo,
    skipReveal,
  ]);

  return (
    <Box pointerEvents="box-none" twClassName="absolute h-0 w-0">
      <CollectiblesSheetModal onRequestClose={handleClose}>
        <BottomSheet
          ref={sheetRef}
          onClose={onClose}
          isInteractable={!isSubmitting}
          testID={CollectiblesPurchaseSheetTestIds.SHEET}
        >
          <Box style={{ height: contentHeight }}>
            {/* Keep the header still when submitting hides the drag handle. */}
            {isSubmitting && <Box twClassName="h-3" />}
            <BottomSheetHeader
              onClose={handleClose}
              closeButtonProps={{
                testID: CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON,
                isDisabled: isSubmitting,
              }}
              textProps={{ numberOfLines: 2 }}
            >
              {displayName}
            </BottomSheetHeader>
            <ScrollView
              style={tw.style('flex-1')}
              contentContainerStyle={tw.style('grow px-4')}
              bounces={false}
              showsVerticalScrollIndicator={false}
              testID={CollectiblesPurchaseSheetTestIds.CONTENT}
            >
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                gap={4}
                paddingVertical={4}
              >
                <Text
                  variant={TextVariant.AmountDisplayLg}
                  fontWeight={FontWeight.Bold}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    fontSize: amountFontSize,
                    lineHeight: amountFontSize * 1.2,
                  }}
                  accessibilityLiveRegion="polite"
                  testID="collectibles-purchase-amount"
                >
                  {amount}
                </Text>
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  disabled={isSubmitting}
                  showPackLabel
                />
              </Box>
              <PackQuantityPresets
                quantity={quantity}
                maximumAffordable={maximumAffordable}
                disabled={isSubmitting}
                onChange={setQuantity}
              />
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                gap={3}
                paddingVertical={2}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="flex-1"
                >
                  {strings('collectibles.purchase.auto_sell_common')}
                </Text>
                <Switch
                  isOn={turbo}
                  onValueChange={setTurbo}
                  isDisabled={isSubmitting}
                  accessibilityLabel={strings(
                    'collectibles.purchase.auto_sell_common',
                  )}
                  testID="collectibles-turbo"
                />
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                gap={3}
                paddingVertical={2}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="flex-1"
                >
                  {strings('collectibles.purchase.skip_reveals')}
                </Text>
                <Switch
                  isOn={skipReveal}
                  onValueChange={updateSkipReveal}
                  isDisabled={isSubmitting}
                  accessibilityLabel={strings(
                    'collectibles.purchase.skip_reveals',
                  )}
                  testID="collectibles-skip-reveals"
                />
              </Box>
              {saveFailed && (
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.ErrorDefault}
                >
                  {strings('collectibles.purchase.preference_not_saved')}
                </Text>
              )}
              <Box paddingBottom={2}>
                <KeyValueRow
                  keyLabel={strings('collectibles.purchase.pay_with')}
                  twClassName="min-h-11"
                  value={
                    <ButtonBase
                      isDisabled
                      startAccessory={<UsdcIcon />}
                      endIconName={IconName.ArrowRight}
                      twClassName="bg-transparent rounded-none px-0"
                      accessibilityLabel={strings(
                        'collectibles.purchase.solana_usdc',
                      )}
                      accessibilityHint={strings(
                        'collectibles.purchase.payment_unavailable',
                      )}
                      testID="collectibles-payment-selector"
                    >
                      {strings('collectibles.purchase.payment_balance', {
                        amount: formatPurchaseAmount(balance),
                      })}
                    </ButtonBase>
                  }
                />
                {/* PackPartner exposes no separate service-fee quote.
                        Never copy Replit's illustrative network fee into a real purchase. */}
                <KeyValueRow
                  keyLabel={strings('collectibles.purchase.total')}
                  value={amount}
                  twClassName="min-h-11"
                  testID="collectibles-purchase-total"
                />
              </Box>
            </ScrollView>
            <Box paddingHorizontal={4} paddingTop={2} paddingBottom={4} gap={3}>
              {!isAffordable && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  accessibilityRole="alert"
                  testID="collectibles-insufficient-usdc"
                >
                  {strings('collectibles.purchase.insufficient_usdc')}
                </Text>
              )}
              {errorMessage ? (
                <BannerAlert
                  severity={BannerAlertSeverity.Danger}
                  description={errorMessage}
                  testID={CollectiblesPurchaseSheetTestIds.ERROR}
                />
              ) : null}
              <CtaButton
                label={strings(
                  quantity === 1
                    ? 'collectibles.purchase.buy_one_pack'
                    : 'collectibles.purchase.buy_packs',
                  { count: quantity },
                )}
                loadingText={strings('collectibles.purchase.generating')}
                isDisabled={!isAffordable || !online}
                isLoading={isSubmitting}
                onPress={handleConfirm}
                testID={CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON}
              />
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {strings('collectibles.purchase.age_requirement')}
              </Text>
            </Box>
          </Box>
        </BottomSheet>
      </CollectiblesSheetModal>
    </Box>
  );
};

export default PackPurchaseSheet;
