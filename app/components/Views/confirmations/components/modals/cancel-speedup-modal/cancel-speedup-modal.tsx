import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import type {
  FeeMarketEIP1559Values,
  GasPriceValue,
  TransactionMeta,
} from '@metamask/transaction-controller';
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
  ExistingGas,
  useCancelSpeedupGas,
} from '../../../hooks/gas/useCancelSpeedupGas';
import NetworkAssetLogo from '../../../../../UI/NetworkAssetLogo';
import InfoSection from '../../UI/info-row/info-section';
import InfoRow from '../../UI/info-row/info-row';
import styleSheet from './cancel-speedup-modal.styles';
import { useStyles } from '../../../../../hooks/useStyles';

const NetworkFee = ({
  fiat,
  native,
  symbol,
  chainId,
}: {
  fiat: string | null;
  native: string;
  symbol: string;
  chainId: Hex;
}) => {
  const tw = useTailwind();
  return (
    <InfoRow label={strings('transactions.network_fee')}>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={3}
        style={tw.style('flex-wrap')}
      >
        {fiat ? <Text variant={TextVariant.BodyMD}>{fiat}</Text> : null}
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={3}
        >
          <Text variant={TextVariant.BodyMD}>{native}</Text>
          <NetworkAssetLogo
            chainId={chainId}
            ticker={symbol}
            big={false}
            biggest={false}
            style={tw.style('rounded-full w-5 h-5')}
            testID="cancel-speedup-network-fee-logo"
          />
          <Text variant={TextVariant.BodyMD}>{symbol}</Text>
        </Box>
      </Box>
    </InfoRow>
  );
};

const Speed = ({ display }: { display: string }) => (
  <InfoRow label={strings('transactions.gas_modal.speed')}>{display}</InfoRow>
);

const Description = ({ text }: { text: string }) => {
  const tw = useTailwind();
  return (
    <Text
      variant={TextVariant.BodySM}
      color={TextColor.Alternative}
      style={tw.style('mt-2 pb-3')}
    >
      {text}
    </Text>
  );
};

export interface CancelSpeedupModalProps {
  isCancel: boolean;
  tx: TransactionMeta | null;
  existingGas: ExistingGas | null;
  onConfirm: (
    params: GasPriceValue | FeeMarketEIP1559Values | undefined,
  ) => void;
  onClose: () => void;
  confirmDisabled?: boolean;
}

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
              <NetworkFee
                fiat={networkFeeFiat}
                native={networkFeeNative}
                symbol={nativeTokenSymbol}
                chainId={chainId}
              />
              <Speed display={speedDisplay} />
            </InfoSection>
            <Description text={description} />
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
