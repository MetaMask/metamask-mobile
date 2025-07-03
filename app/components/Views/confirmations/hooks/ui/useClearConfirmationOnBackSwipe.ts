import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { StakeNavigationParamsList } from '../../../../UI/Stake/types';
import { useConfirmActions } from '../useConfirmActions';
<<<<<<< HEAD
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
=======
import { useStandaloneConfirmation } from './useStandaloneConfirmation';
>>>>>>> stable

const useClearConfirmationOnBackSwipe = () => {
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
<<<<<<< HEAD
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isIos()) {
=======
  const { isStandaloneConfirmation } = useStandaloneConfirmation();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    if (isStandaloneConfirmation && Device.isIos()) {
>>>>>>> stable
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        onReject();
      });

      return unsubscribe;
    }
<<<<<<< HEAD
  }, [isFullScreenConfirmation, navigation, onReject]);

  useEffect(() => {
    if (isFullScreenConfirmation && Device.isAndroid()) {
=======
  }, [isStandaloneConfirmation, navigation, onReject]);

  useEffect(() => {
    if (isStandaloneConfirmation && Device.isAndroid()) {
>>>>>>> stable
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
<<<<<<< HEAD
  }, [isFullScreenConfirmation, onReject]);
=======
  }, [isStandaloneConfirmation, onReject]);
>>>>>>> stable
};

export default useClearConfirmationOnBackSwipe;
