import { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import {
  ToastContext,
  ToastVariants,
  ButtonIconVariant,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { storeArcUsageNoticeShown } from '../../../../actions/legalNotices';
import { selectShouldShowArcUsageNotice } from '../../../../selectors/legalNotices';

const ARC_CAIP_CHAIN_ID = 'eip155:5042';

export const useArcUsageNoticeToast = (): void => {
  const { toastRef } = useContext(ToastContext);
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const shouldShow = useSelector(selectShouldShowArcUsageNotice);
  const { trackEvent, createEventBuilder } = useAnalytics();

  useEffect(() => {
    if (!isFocused || !shouldShow) {
      return;
    }
    const toast = toastRef?.current;
    dispatch(storeArcUsageNoticeShown());
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ARC_USAGE_NOTICE_TOAST_VIEWED)
        .addProperties({ chain_id_caip: ARC_CAIP_CHAIN_ID })
        .build(),
    );
    toast?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        { label: strings('arc_usage_notice.title'), isBold: true },
      ],
      descriptionOptions: {
        description: strings('arc_usage_notice.description'),
      },
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: () => {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.ARC_USAGE_NOTICE_TOAST_DISMISSED,
            )
              .addProperties({ chain_id_caip: ARC_CAIP_CHAIN_ID })
              .build(),
          );
          toast?.closeToast();
        },
      },
      hasNoTimeout: true,
    });
  }, [
    createEventBuilder,
    dispatch,
    isFocused,
    shouldShow,
    toastRef,
    trackEvent,
  ]);
};
