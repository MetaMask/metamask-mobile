import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../util/device';
import { StakeNavigationParamsList } from '../../../UI/Stake/types';
import { useConfirmActions } from './useConfirmActions';

const useClearConfirmationOnBackSwipe = () => {
  const navigation = useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    if (Device.isIos()) {
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        onReject();
      });

    return unsubscribe;
    }
  }, [navigation, onReject]);

  useEffect(() => {
    if (Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onReject();
          return true;
        }
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [onReject]);
};

export default useClearConfirmationOnBackSwipe;
