import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { useTheme } from '../../../../../util/theme';
import { getNavbar } from '../../components/UI/navbar/navbar';
import { useConfirmActions } from '../useConfirmActions';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';

const useNavbar = (title: string, addBackButton = true) => {
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
        }),
      );
    }
  }, [
    addBackButton,
    isFullScreenConfirmation,
    navigation,
    onReject,
    theme,
    title,
  ]);
};

export default useNavbar;
