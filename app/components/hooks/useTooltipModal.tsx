import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';

const useTooltipModal = () => {
  const { navigate } = useNavigation();

  const openTooltipModal = (title: string, tooltip: string) =>
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.TOOLTIP_MODAL,
      params: { title, tooltip },
    });

  return { openTooltipModal };
};

export default useTooltipModal;
