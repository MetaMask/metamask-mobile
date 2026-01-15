import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button/Button.types';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { strings } from '../../../../../../locales/i18n';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';

interface LearnMoreModalFooterProps {
  onClose: () => void;
  learnMoreUrl: string;
  style?: StyleProp<ViewStyle>;
}

const LearnMoreModalFooter = ({
  onClose,
  learnMoreUrl,
  style,
}: LearnMoreModalFooterProps) => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const redirectToLearnMore = () => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: learnMoreUrl,
      },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Learn More',
          location: EVENT_LOCATIONS.LEARN_MORE_MODAL,
        })
        .build(),
    );
  };

  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: strings('stake.learn_more'),
      size: ButtonSize.Lg,
      labelTextVariant: TextVariant.BodyMDMedium,
      onPress: redirectToLearnMore,
    },
    {
      variant: ButtonVariants.Primary,
      label: strings('stake.got_it'),
      labelTextVariant: TextVariant.BodyMDMedium,
      size: ButtonSize.Lg,
      onPress: onClose,
    },
  ];

  return (
    <BottomSheetFooter
      buttonsAlignment={ButtonsAlignment.Horizontal}
      buttonPropsArray={footerButtons}
      style={style}
    />
  );
};

export default LearnMoreModalFooter;
