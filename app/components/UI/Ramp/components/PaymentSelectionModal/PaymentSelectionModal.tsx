import React, { useCallback, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PaymentSelectionModal.styles';
import Routes from '../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import PaymentMethodListItem from './PaymentMethodListItem';
import ProviderSelection from './ProviderSelection';
import type { PaymentMethod, Provider } from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';

export const createPaymentSelectionModalNavigationDetails =
  createNavigationDetails(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PAYMENT_SELECTION,
  );

const ANIMATION_DURATION = 300;

function PaymentSelectionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
    screenWidth,
  });

  const {
    selectedProvider,
    setSelectedProvider,
    providers,
    paymentMethods,
    setSelectedPaymentMethod,
  } = useRampsController();

  const translateX = useSharedValue(0);

  const paymentPageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const providerPageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + screenWidth }],
  }));

  const handleChangeProviderPress = useCallback(() => {
    translateX.value = withTiming(-screenWidth, {
      duration: ANIMATION_DURATION,
    });
  }, [screenWidth, translateX]);

  const handleProviderBack = useCallback(() => {
    translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
  }, [translateX]);

  const handleProviderSelect = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      translateX.value = withTiming(0, { duration: ANIMATION_DURATION });
    },
    [setSelectedProvider, translateX],
  );

  const handlePaymentMethodPress = useCallback(
    (paymentMethod: PaymentMethod) => {
      setSelectedPaymentMethod(paymentMethod);
      sheetRef.current?.onCloseBottomSheet();
    },
    [setSelectedPaymentMethod],
  );

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: PaymentMethod }) => (
      <PaymentMethodListItem
        paymentMethod={paymentMethod}
        onPress={() => handlePaymentMethodPress(paymentMethod)}
      />
    ),
    [handlePaymentMethodPress],
  );

  const renderFooter = useCallback(
    () =>
      selectedProvider ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="px-4 py-4"
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('fiat_on_ramp.buying_via', {
              providerName: selectedProvider.name,
            })}{' '}
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Primary}
              onPress={handleChangeProviderPress}
            >
              {strings('fiat_on_ramp.change_provider')}
            </Text>
          </Text>
        </Box>
      ) : null,
    [selectedProvider, handleChangeProviderPress],
  );

  const renderListContent = () => (
    <FlatList
      style={styles.list}
      data={paymentMethods}
      renderItem={renderPaymentMethod}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="none"
      keyboardShouldPersistTaps="always"
      ListFooterComponent={renderFooter}
    />
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <Box
        twClassName="overflow-hidden relative"
        style={{ minHeight: screenHeight * 0.5 }}
      >
        <Animated.View style={[styles.overlay, paymentPageStyle]}>
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="px-4 py-3"
          >
            <Text variant={TextVariant.HeadingMD}>
              {strings('fiat_on_ramp.pay_with')}
            </Text>
          </Box>
          {renderListContent()}
        </Animated.View>

        <Animated.View style={[styles.overlay, providerPageStyle]}>
          <ProviderSelection
            providers={providers}
            selectedProvider={selectedProvider}
            onProviderSelect={handleProviderSelect}
            onBack={handleProviderBack}
          />
        </Animated.View>
      </Box>
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
