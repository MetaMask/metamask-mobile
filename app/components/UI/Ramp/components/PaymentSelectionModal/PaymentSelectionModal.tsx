import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { AnimationDuration } from '../../../../../component-library/constants/animation.constants';
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

enum ViewType {
  PAYMENT = 'PAYMENT',
  PROVIDER = 'PROVIDER',
}

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
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  } = useRampsController();

  const [activeView, setActiveView] = useState(ViewType.PAYMENT);
  const translateX = useSharedValue(0);

  useEffect(() => {
    const animationConfig = {
      duration: AnimationDuration.Regularly,
      easing: Easing.out(Easing.ease),
    };

    if (activeView === ViewType.PROVIDER) {
      translateX.value = withTiming(-screenWidth, animationConfig);
    } else {
      translateX.value = withTiming(0, animationConfig);
    }
  }, [activeView, screenWidth, translateX]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleChangeProviderPress = useCallback(() => {
    setActiveView(ViewType.PROVIDER);
  }, []);

  const handleProviderBack = useCallback(() => {
    setActiveView(ViewType.PAYMENT);
  }, []);

  const handleProviderSelect = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      setActiveView(ViewType.PAYMENT);
    },
    [setSelectedProvider],
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
        isSelected={selectedPaymentMethod?.id === paymentMethod.id}
      />
    ),
    [handlePaymentMethodPress, selectedPaymentMethod],
  );

  const renderListContent = () => (
    <FlatList
      style={styles.list}
      data={paymentMethods}
      renderItem={renderPaymentMethod}
      keyExtractor={(item) => item.id}
      keyboardDismissMode="none"
      keyboardShouldPersistTaps="always"
    />
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <View style={styles.containerOuter}>
        <Animated.View style={[styles.containerInner, animatedContainerStyle]}>
          <View style={styles.panel}>
            <View style={styles.paymentPanelContent}>
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
            </View>
            {selectedProvider ? (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                style={styles.footer}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
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
            ) : null}
          </View>
          <View style={styles.panel}>
            <ProviderSelection
              providers={providers}
              selectedProvider={selectedProvider}
              onProviderSelect={handleProviderSelect}
              onBack={handleProviderBack}
            />
          </View>
        </Animated.View>
      </View>
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
