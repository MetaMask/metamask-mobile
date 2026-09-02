import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type TwapOrder,
} from '@metamask/perps-controller';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';

interface PerpsProTwapTerminateSheetProps {
  twapOrder: TwapOrder;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  onClose: () => void;
  onConfirm: (twapOrder: TwapOrder) => void;
  isTerminating?: boolean;
}

/**
 * Confirmation gate for terminating a running TWAP.
 *
 * Terminating stops the remaining size from executing. Opening TWAPs can leave
 * filled exposure behind; reduce-only TWAP fills have already reduced it.
 */
const PerpsProTwapTerminateSheet = ({
  twapOrder,
  sheetRef,
  onClose,
  onConfirm,
  isTerminating = false,
}: PerpsProTwapTerminateSheetProps) => {
  const handleConfirm = useCallback(() => {
    onConfirm(twapOrder);
  }, [onConfirm, twapOrder]);

  const secondaryButtonProps = useMemo(
    () => ({
      children: strings('perps.pro_positions_panel.twap_terminate.cancel'),
      onPress: onClose,
      size: ButtonSize.Lg,
      isDisabled: isTerminating,
      testID: PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_CANCEL,
    }),
    [isTerminating, onClose],
  );

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.pro_positions_panel.twap_terminate.confirm'),
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDanger: true,
      isLoading: isTerminating,
      isDisabled: isTerminating,
      testID: PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_CONFIRM,
    }),
    [handleConfirm, isTerminating],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_SHEET}
    >
      <BottomSheetHeader
        onClose={onClose}
        closeButtonProps={{
          testID: PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE_CLOSE,
        }}
      >
        {strings('perps.pro_positions_panel.twap_terminate.title', {
          symbol: getPerpsDisplaySymbol(twapOrder.symbol),
        })}
      </BottomSheetHeader>

      <Box paddingHorizontal={4}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(
            twapOrder.reduceOnly
              ? 'perps.pro_positions_panel.twap_terminate.description_reduce_only'
              : 'perps.pro_positions_panel.twap_terminate.description',
          )}
        </Text>
      </Box>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        secondaryButtonProps={secondaryButtonProps}
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-6"
      />
    </BottomSheet>
  );
};

export default PerpsProTwapTerminateSheet;
