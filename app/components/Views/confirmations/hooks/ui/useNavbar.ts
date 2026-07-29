import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useEffect } from 'react';
import {
  getModalNavigationOptions,
  NavbarOverrides,
} from '../../components/UI/navbar/navbar';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';
import { useConfirmationContext } from '../../context/confirmation-context';

/**
 * Registers an inline full-screen confirmation header (rendered by Confirm).
 * Stack header stays hidden — see Confirm `headerShown: false`.
 */
const useNavbar = (
  title: string,
  addBackButton = true,
  overrides?: NavbarOverrides,
) => {
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const { setNavHeaderConfig } = useConfirmationContext();

  useEffect(() => {
    if (!isFullScreenConfirmation) {
      return;
    }

    setNavHeaderConfig({
      title,
      addBackButton,
      overrides,
    });

    return () => {
      setNavHeaderConfig(null);
    };
  }, [
    addBackButton,
    isFullScreenConfirmation,
    overrides,
    setNavHeaderConfig,
    title,
  ]);
};

export function useModalNavbar() {
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    navigation.setOptions(getModalNavigationOptions());
  }, [navigation]);
}

export default useNavbar;
