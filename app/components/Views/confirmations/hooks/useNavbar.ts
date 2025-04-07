import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEffect } from 'react';
import { useTheme } from '../../../../util/theme';
import { StakeNavigationParamsList } from '../../../UI/Stake/types';
import { getNavbar } from '../components/Confirm/Navbar/Navbar';
import { useConfirmActions } from './useConfirmActions';

const useNavbar = (title: string, addBackButton = true) => {
  const navigation =
    useNavigation<StackNavigationProp<StakeNavigationParamsList>>();
  const { onReject } = useConfirmActions();
  const theme = useTheme();

  useEffect(() => {
    navigation.setOptions(
      getNavbar({
        title,
        onReject,
        addBackButton,
        theme,
      }),
    );
  }, [navigation, onReject, theme, title, addBackButton]);
};

export default useNavbar;
