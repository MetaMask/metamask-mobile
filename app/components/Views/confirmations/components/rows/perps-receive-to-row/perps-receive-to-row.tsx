import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../../locales/i18n';
import { selectPerpsLighterProviderEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  isLighterProviderEnabled,
  isPerpsLighterConfirmationEnabled,
} from '../../../../../UI/Perps/utils/lighterFeatureFlags';
import { PerpsReceiveToSelectorsIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

type PerpsReceiveDestination = 'hyperliquid' | 'lighter';

/**
 * Display amounts from the deposit mock. This task does not read protocol
 * balances, so these stay constant until a later ticket wires them.
 */
const PLACEHOLDER_AVAILABLE_BALANCE: Record<PerpsReceiveDestination, string> = {
  hyperliquid: '$780.01',
  lighter: '$15.88',
};

const DESTINATION_ICON: Record<PerpsReceiveDestination, IconName> = {
  hyperliquid: IconName.Chart,
  lighter: IconName.Candlestick,
};

function DestinationIcon({
  destination,
}: {
  destination: PerpsReceiveDestination;
}) {
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-6 w-6 rounded-full bg-muted"
    >
      <Icon
        name={DESTINATION_ICON[destination]}
        size={IconSize.Sm}
        color={
          destination === 'hyperliquid'
            ? IconColor.SuccessDefault
            : IconColor.IconDefault
        }
      />
    </Box>
  );
}

export const PerpsReceiveToRow: React.FC = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const providerFlagEnabled = useSelector(
    selectPerpsLighterProviderEnabledFlag,
  );
  const sheetRef = useRef<BottomSheetRef>(null);
  const [destination, setDestination] =
    useState<PerpsReceiveDestination>('hyperliquid');
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const isVisible =
    isPerpsLighterConfirmationEnabled() &&
    isLighterProviderEnabled() &&
    providerFlagEnabled &&
    hasTransactionType(transactionMeta, [TransactionType.perpsDeposit]);

  const closeSheet = useCallback(() => {
    setIsSheetVisible(false);
  }, []);

  const handleSelect = useCallback((next: PerpsReceiveDestination) => {
    setDestination(next);
    sheetRef.current?.onCloseBottomSheet();
    setIsSheetVisible(false);
  }, []);

  if (!isVisible) {
    return null;
  }

  const selectedLabel = strings(`confirm.perps_receive_to.${destination}`);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings('confirm.label.receive_to')}
        onPress={() => setIsSheetVisible(true)}
        testID={PerpsReceiveToSelectorsIDs.ROW}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="min-h-[34px] px-2 pb-2.5"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('confirm.label.receive_to')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <DestinationIcon destination={destination} />
            <Text variant={TextVariant.BodyMd}>{selectedLabel}</Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Box>
      </Pressable>
      {isSheetVisible && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={closeSheet}
        >
          <Box twClassName="flex-1">
            <BottomSheet
              ref={sheetRef}
              testID={PerpsReceiveToSelectorsIDs.SHEET}
              onClose={closeSheet}
            >
              <BottomSheetHeader onBack={closeSheet} onClose={closeSheet}>
                {strings('confirm.label.receive_to')}
              </BottomSheetHeader>
              <Box twClassName="px-4 pt-3">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('confirm.perps_receive_to.section')}
                </Text>
              </Box>
              {(['hyperliquid', 'lighter'] as const).map((option) => (
                <ListItemSelect
                  key={option}
                  title={strings(`confirm.perps_receive_to.${option}`)}
                  description={strings('confirm.perps_receive_to.available', {
                    amount: PLACEHOLDER_AVAILABLE_BALANCE[option],
                  })}
                  startAccessory={<DestinationIcon destination={option} />}
                  isSelected={option === destination}
                  showSelectedIcon={false}
                  onPress={() => handleSelect(option)}
                  testID={`${PerpsReceiveToSelectorsIDs.OPTION}-${option}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: option === destination }}
                />
              ))}
            </BottomSheet>
          </Box>
        </Modal>
      )}
    </>
  );
};
