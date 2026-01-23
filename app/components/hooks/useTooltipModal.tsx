import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { ReactNode, useCallback, useMemo } from 'react';

interface TooltipOptions {
  bottomPadding?: number;
}

const useTooltipModal = () => {
  const { navigate } = useNavigation();

  const openTooltipModal = useCallback(
    (
      title: string,
      tooltip: string | ReactNode,
      footerText?: string,
      buttonText?: string,
      options?: TooltipOptions,
    ) =>
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TOOLTIP_MODAL,
        params: {
          title,
          tooltip,
          footerText,
          buttonText,
          bottomPadding: options?.bottomPadding,
        },
      }),
    [navigate],
  );

  return useMemo(() => ({ openTooltipModal }), [openTooltipModal]);
};

export default useTooltipModal;
