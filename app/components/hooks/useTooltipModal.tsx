import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { ReactNode } from 'react';

interface TooltipOptions {
  bottomPadding?: number;
}

const useTooltipModal = () => {
  const { navigate } = useNavigation();

  const openTooltipModal = (
    title: string,
    tooltip: string | ReactNode,
    options?: TooltipOptions,
  ) =>
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.TOOLTIP_MODAL,
      params: { title, tooltip, bottomPadding: options?.bottomPadding },
    });

  return { openTooltipModal };
};

export default useTooltipModal;
