import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { StakeNavigationParamsList } from '../../../../UI/Stake/types';
import {
  getModalNavigationOptions,
  getNavbar,
} from '../../components/UI/navbar/navbar';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';

const useNavbar = (title: string, addBackButton = true) => {
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { onReject } = useConfirmActions();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();

  useEffect(() => {
    if (isFullScreenConfirmation) {
      navigation.setOptions(
        getNavbar({
          title,
          onReject,
          addBackButton,
        }),
      );
    }
  }, [addBackButton, isFullScreenConfirmation, navigation, onReject, title]);
};

export function useModalNavbar() {
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();

  const { onReject } = useConfirmActions();

  useEffect(() => {
    navigation.setOptions(getModalNavigationOptions());
  }, [navigation, onReject]);
}

export default useNavbar;
