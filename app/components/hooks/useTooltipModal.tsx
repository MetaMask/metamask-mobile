import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../core/NavigationService/types';
import Routes from '../../constants/navigation/Routes';
import { ReactNode, useCallback, useMemo } from 'react';

const useTooltipModal = () => {
  const { navigate } = useNavigation<AppNavigationProp>();

  const openTooltipModal = useCallback(
    (
      title: string,
      tooltip: string | ReactNode,
      footerText?: string,
      buttonText?: string,
      onButtonPress?: () => void,
      dismissOnButtonPress?: boolean,
    ) =>
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TOOLTIP_MODAL,
        params: {
          title,
          tooltip,
          footerText,
          buttonText,
          onButtonPress,
          dismissOnButtonPress,
        },
      }),
    [navigate],
  );

  return useMemo(() => ({ openTooltipModal }), [openTooltipModal]);
};

export default useTooltipModal;
