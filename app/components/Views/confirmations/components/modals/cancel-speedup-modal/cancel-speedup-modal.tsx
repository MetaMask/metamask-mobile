import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../../components/UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
} from '../../../../../../components/UI/Box/box.types';
import {
  CancelSpeedupParams,
  ExistingGas,
  useCancelSpeedupGas,
} from '../../../hooks/gas/useCancelSpeedupGas';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row/info-row';
import styleSheet from './cancel-speedup-modal.styles';
import { useStyles } from '../../../../../hooks/useStyles';

export interface CancelSpeedupModalProps {
  isCancel: boolean;
  tx: TransactionMeta | null;
  existingGas: ExistingGas | null;
  onConfirm: (params: CancelSpeedupParams | undefined) => void;
  onClose: () => void;
  confirmDisabled?: boolean;
}

/**
 * Modal for Speed up or Cancel transaction.
 * Displays Network fee and Speed rows. On confirm, calls controller with computed params.
 */
export function CancelSpeedupModal({
  isCancel,
  tx,
  existingGas,
  onConfirm,
  onClose,
  confirmDisabled = false,
}: CancelSpeedupModalProps) {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const {
    paramsForController,
    networkFeeNative,
    networkFeeFiat,
    speedDisplay,
    nativeTokenSymbol,
  } = useCancelSpeedupGas({ existingGas, tx, isCancel });

  const close = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onClose();
    });
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (confirmDisabled) return;
    onConfirm(paramsForController);
  }, [onConfirm, paramsForController, confirmDisabled]);

  const title = isCancel
    ? strings('transaction.cancel_speedup_cancel_title')
    : strings('transaction.cancel_speedup_speedup_title');
  const description = isCancel
    ? strings('transaction.cancel_speedup_cancel_message')
    : strings('transaction.cancel_speedup_speedup_message');

  const chainId = (tx?.chainId ?? '') as Hex;

  const networkFeeValue = (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={3}
      style={tw.style('flex-wrap')}
    >
      {networkFeeFiat ? (
        <Text variant={TextVariant.BodyMD}>{networkFeeFiat}</Text>
      ) : null}
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={3}
      >
        <Text variant={TextVariant.BodyMD}>{networkFeeNative}</Text>
        <NetworkAssetLogo
          chainId={chainId}
          ticker={nativeTokenSymbol}
          big={false}
          biggest={false}
          style={tw.style('rounded-full')}
          testID="cancel-speedup-network-fee-logo"
        />
        <Text variant={TextVariant.BodyMD}>{nativeTokenSymbol}</Text>
      </Box>
    </Box>
  );

  const buttons = [
    {
      variant: ButtonVariants.Primary,
      label: strings('transaction.confirm'),
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      isDisabled: confirmDisabled,
    },
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      style={styles.bottomSheetDialogSheet}
    >
      <HeaderCompactStandard title={title} onClose={close} />
      <Box style={tw.style('px-3')}>
        <ScrollView>
          <Box gap={4}>
            <InfoSection>
              <InfoRow label={strings('transactions.network_fee')}>
                {networkFeeValue}
              </InfoRow>
              <InfoRow label={strings('transactions.gas_modal.speed')}>
                {speedDisplay}
              </InfoRow>
            </InfoSection>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={tw.style('mt-2 pb-3')}
            >
              {description}
            </Text>
          </Box>
        </ScrollView>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Vertical}
          buttonPropsArray={buttons}
          style={tw.style('px-0')}
        />
      </Box>
    </BottomSheet>
  );
}
