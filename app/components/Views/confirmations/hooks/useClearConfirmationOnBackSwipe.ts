import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { StakeNavigationParamsList } from '../../../UI/Stake/types';
import { useConfirmActions } from './useConfirmActions';

const useClearConfirmationOnBackSwipe = () => {
  const navigation = useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { onReject } = useConfirmActions();

  useEffect(() => {
    const unsubscribe = navigation.addListener('gestureEnd', () => {
      onReject();
    });

    return unsubscribe;
  }, [navigation, onReject]);
};

export default useClearConfirmationOnBackSwipe;
