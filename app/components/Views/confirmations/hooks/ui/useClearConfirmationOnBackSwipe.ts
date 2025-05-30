import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import Device from '../../../../../util/device';
import { StakeNavigationParamsList } from '../../../../UI/Stake/types';
import { useConfirmActions } from '../useConfirmActions';
import { useStandaloneConfirmation } from './useStandaloneConfirmation';

const useClearConfirmationOnBackSwipe = () => {
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { isStandaloneConfirmation } = useStandaloneConfirmation();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    if (isStandaloneConfirmation && Device.isIos()) {
      const unsubscribe = navigation.addListener('gestureEnd', () => {
        onReject();
      });

      return unsubscribe;
    }
  }, [isStandaloneConfirmation, navigation, onReject]);

  useEffect(() => {
    if (isStandaloneConfirmation && Device.isAndroid()) {
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
  }, [isStandaloneConfirmation, onReject]);
};

export default useClearConfirmationOnBackSwipe;
