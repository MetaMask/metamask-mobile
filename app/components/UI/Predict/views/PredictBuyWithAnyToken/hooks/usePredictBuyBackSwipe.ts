import { ParamListBase, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../../util/device';

const usePredictBuyBackSwipe = ({ onBack }: { onBack: () => void }) => {
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('gestureEnd', () => {
      onBack();
    });

    return unsubscribe;
  }, [navigation, onBack]);

  useEffect(() => {
    if (Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onBack();
          return true;
        },
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [onBack]);
};

export default usePredictBuyBackSwipe;
