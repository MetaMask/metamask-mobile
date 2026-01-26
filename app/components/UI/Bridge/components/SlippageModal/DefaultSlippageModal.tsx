import React, { useCallback, useRef, useState } from 'react';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import { DefaultSlippageButtonGroup } from './DefaultSlippageButtonGroup';
import { defaultSlippageModalStyles as styles } from './styles';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useGetSlippageOptions } from '../../hooks/useGetSlippageOptions';
import { AUTO_SLIPPAGE_VALUE } from './constants';
import { DefaultSLippageModalParams } from './types';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useSlippageConfig } from '../../hooks/useSlippageConfig';
import { SlippageType } from '../../types';

export const DefaultSlippageModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const sheetRef = useRef<BottomSheetRef>(null);
  const slippage = useSelector(selectSlippage);
  const [selectedSlippage, setSelectedSlippage] = useState<SlippageType>(
    slippage ?? AUTO_SLIPPAGE_VALUE,
  );
  const { network } = useParams<DefaultSLippageModalParams>();
  const slippageConfig = useSlippageConfig(network);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleCustomOptionPress = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.CUSTOM_SLIPPAGE_MODAL,
    });
  }, [navigation]);

  const handleSubmit = useCallback(() => {
    dispatch(
      setSlippage(
        selectedSlippage === undefined ||
          selectedSlippage === AUTO_SLIPPAGE_VALUE
          ? undefined
          : String(selectedSlippage),
      ),
    );
    sheetRef.current?.onCloseBottomSheet();
  }, [selectedSlippage, dispatch]);

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
      <HeaderCenter title={strings('bridge.slippage')} onClose={handleClose} />
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
