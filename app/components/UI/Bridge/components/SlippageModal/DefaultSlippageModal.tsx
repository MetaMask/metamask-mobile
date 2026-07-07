import React, { useCallback, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
} from '@metamask/design-system-react-native';
import { DefaultSlippageButtonGroup } from './DefaultSlippageButtonGroup';
import { defaultSlippageModalStyles as styles } from './styles';
import { useGetSlippageOptions } from '../../hooks/useGetSlippageOptions';
import { AUTO_SLIPPAGE_VALUE } from './constants';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { SlippageType } from '../../types';
import { CaipChainId, Hex } from '@metamask/utils';

interface DefaultSlippageModalContentProps {
  initialSlippage?: SlippageType;
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
  onSubmitSlippage: (slippage: string | undefined) => void;
  onOpenCustomSlippage: () => void;
}

export const DefaultSlippageModalContent = ({
  initialSlippage,
  sourceChainId,
  destChainId,
  onSubmitSlippage,
  onOpenCustomSlippage,
}: DefaultSlippageModalContentProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [selectedSlippage, setSelectedSlippage] = useState<SlippageType>(
    initialSlippage ?? AUTO_SLIPPAGE_VALUE,
  );
  const slippageConfig = useSlippageConfig({ sourceChainId, destChainId });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleCustomOptionPress = useCallback(() => {
    onOpenCustomSlippage();
  }, [onOpenCustomSlippage]);

  const handleSubmit = useCallback(() => {
    const nextSlippage =
      selectedSlippage === undefined || selectedSlippage === AUTO_SLIPPAGE_VALUE
        ? undefined
        : String(selectedSlippage);

    onSubmitSlippage(nextSlippage);
    sheetRef.current?.onCloseBottomSheet();
  }, [selectedSlippage, onSubmitSlippage]);

  const handleDefaultOptionPress = useCallback(
    (value: SlippageType) => () => {
      setSelectedSlippage(value);
    },
    [],
  );

  const slippageOptions = useGetSlippageOptions({
    slippageOptions: slippageConfig.default_slippage_options,
    allowCustomSlippage: slippageConfig.has_custom_slippage_option,
    slippage: selectedSlippage,
    onDefaultOptionPress: handleDefaultOptionPress,
    onCustomOptionPress: handleCustomOptionPress,
  });

  return (
    <BottomSheet ref={sheetRef}>
      <HeaderStandard
        title={strings('bridge.slippage')}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('bridge.close'),
        }}
      />
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionText}>
          {strings('bridge.default_slippage_description')}
        </Text>
      </View>
      <View>
        <DefaultSlippageButtonGroup options={slippageOptions} />
      </View>
      <View style={styles.footerContainer}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleSubmit}
          isFullWidth
        >
          {strings('bridge.submit')}
        </Button>
      </View>
    </BottomSheet>
  );
};
