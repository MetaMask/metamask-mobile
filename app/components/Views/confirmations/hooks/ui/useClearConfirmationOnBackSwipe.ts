import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';

const useClearConfirmationOnBackSwipe = () => {
  const navigation = useNavigation();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    if (isFullScreenConfirmation) {
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        onReject();
      });

      return unsubscribe;
    }
  }, [isFullScreenConfirmation, navigation, onReject]);

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isAndroid()) {
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          onReject();
          return true;
        },
      );

      return () => {
        backHandlerSubscription.remove();
      };
    }
  }, [isFullScreenConfirmation, onReject]);
};

export default useClearConfirmationOnBackSwipe;
