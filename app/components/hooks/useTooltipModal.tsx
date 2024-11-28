import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { ReactNode } from 'react';

const useTooltipModal = () => {
  const { navigate } = useNavigation();

  const openTooltipModal = (title: string, tooltip: string | ReactNode) =>
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.TOOLTIP_MODAL,
      params: { title, tooltip },
    });

  return { openTooltipModal };
};

export default useTooltipModal;
