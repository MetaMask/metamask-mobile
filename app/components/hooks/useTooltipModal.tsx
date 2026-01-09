import Routes from '../../constants/navigation/Routes';
import { ReactNode } from 'react';
import { useNavigation } from '../../util/navigation/navUtils';

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
