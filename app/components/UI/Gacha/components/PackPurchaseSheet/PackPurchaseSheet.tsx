import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, useWindowDimensions } from 'react-native';
import {
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  FontWeight,
  ImageOrSvg,
  KeyValueRow,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import Engine from '../../../../../core/Engine';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import I18n, { strings } from '../../../../../../locales/i18n';
import { GachaPurchaseSheetTestIds } from '../../Gacha.testIds';
import { getCollectorCryptPackArtwork } from '../../assets/packs';
import { COLLECTOR_CRYPT_RARITIES } from '../../providers/collector-crypt/constants';
import type {
  CollectorCryptPack,
  SolanaAccountRef,
} from '../../providers/collector-crypt/types';
import { formatUsdcAmount } from '../../providers/collector-crypt/utils/format';
import { getErrorMessageFromUnknown } from '../../providers/collector-crypt/utils/errorMessages';
import CtaButton from '../CtaButton';
import UsdcAmount from '../UsdcAmount';
import {
  canAffordPack,
  getPackPriceBaseUnits,
} from '../PackCard/PackCard.utils';

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
  const { height } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const price = getPackPriceBaseUnits(pack.price);
  const isAffordable = canAffordPack(balance, pack.price);
  const artwork = getCollectorCryptPackArtwork(pack.code);
  const displayName = artwork.name ?? pack.name;
  const imageHeight = Math.min(300, height * 0.32);
  const oddsFormatter = getIntlNumberFormatter(I18n.locale, {
    style: 'percent',
    maximumSignificantDigits: 4,
  });

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
              {/* Keep the header still when submitting hides the drag handle. */}
              {isSubmitting && <Box twClassName="h-3" />}
              <BottomSheetHeader
                onClose={handleClose}
                closeButtonProps={{
                  testID: GachaPurchaseSheetTestIds.CLOSE_BUTTON,
                  isDisabled: isSubmitting,
                }}
              >
                {displayName}
              </BottomSheetHeader>
              <ScrollView
                style={tw.style('grow-0 shrink min-h-0')}
                bounces
                alwaysBounceVertical={false}
                decelerationRate="normal"
                showsVerticalScrollIndicator={false}
                testID={GachaPurchaseSheetTestIds.CONTENT}
              >
                <Box paddingHorizontal={4} paddingBottom={4} gap={4}>
                  <Box alignItems={BoxAlignItems.Center}>
                    <ImageOrSvg
                      src={artwork.image}
                      width={imageHeight / 2}
                      height={imageHeight}
                      imageProps={{
                        contentFit: 'contain',
                        accessibilityLabel: displayName,
                        testID: GachaPurchaseSheetTestIds.IMAGE,
                      }}
                    />
                  </Box>
                  <Box>
                    <KeyValueRow
                      keyLabel={strings('gacha.purchase.price')}
                      value={
                        <UsdcAmount
                          amount={formatUsdcAmount(price)}
                          variant={TextVariant.BodyLg}
                        />
                      }
                    />
                  </Box>
                  <Box gap={2} testID={GachaPurchaseSheetTestIds.ODDS}>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      accessibilityRole="header"
                    >
                      {strings('gacha.purchase.odds')}
                    </Text>
                    <Box twClassName="rounded-xl border border-muted overflow-hidden">
                      {COLLECTOR_CRYPT_RARITIES.map((rarity, index) => (
                        <KeyValueRow
                          key={rarity}
                          keyLabel={strings(`gacha.rarity.${rarity}`)}
                          value={oddsFormatter.format(pack.odds[rarity])}
                          twClassName={`h-auto min-h-10 py-2${index > 0 ? ' border-t border-muted' : ''}`}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </ScrollView>
              <Box
                paddingHorizontal={4}
                paddingTop={3}
                paddingBottom={4}
                gap={3}
              >
                {errorMessage ? (
                  <BannerAlert
                    severity={BannerAlertSeverity.Danger}
                    description={errorMessage}
                    testID={GachaPurchaseSheetTestIds.ERROR}
                  />
                ) : null}
                <CtaButton
                  label={strings(
                    isAffordable
                      ? 'gacha.purchase.confirm'
                      : 'gacha.packs.insufficient_usdc',
                  )}
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
