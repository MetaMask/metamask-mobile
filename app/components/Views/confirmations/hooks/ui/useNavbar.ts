import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { useTheme } from '../../../../../util/theme';
import {
  getModalNavigationOptions,
  getNavbar,
  NavbarOverrides,
} from '../../components/UI/navbar/navbar';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';

const useNavbar = (
  title: string,
  addBackButton = true,
  overrides?: NavbarOverrides,
) => {
  const navigation = useNavigation();
  const { onReject } = useConfirmActions();
  const theme = useTheme();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();

  useEffect(() => {
    if (isFullScreenConfirmation) {
      navigation.setOptions(
        getNavbar({
          title,
          onReject,
          addBackButton,
          theme,
          overrides,
        }),
      );
    }
  }, [
    addBackButton,
    isFullScreenConfirmation,
    navigation,
    onReject,
    overrides,
    theme,
    title,
  ]);
};

export function useModalNavbar() {
  const navigation = useNavigation();

  const { onReject } = useConfirmActions();

  useEffect(() => {
    navigation.setOptions(getModalNavigationOptions());
  }, [navigation, onReject]);
}

export default useNavbar;
