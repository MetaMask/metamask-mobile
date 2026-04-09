import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { ReactNode, useCallback, useMemo } from 'react';

const useTooltipModal = () => {
  const { navigate } = useNavigation();

  const openTooltipModal = useCallback(
    (
      title: string,
      tooltip: string | ReactNode,
      footerText?: string,
      buttonText?: string,
      onButtonPress?: () => void,
    ) =>
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TOOLTIP_MODAL,
        params: {
          title,
          tooltip,
          footerText,
          buttonText,
          onButtonPress,
        },
      }),
    [navigate],
  );

  return useMemo(() => ({ openTooltipModal }), [openTooltipModal]);
};

export default useTooltipModal;
