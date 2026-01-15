import React, { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../hooks/useStyles';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { strings } from '../../../../../../../locales/i18n';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../../Stake/constants/events';
import { endTrace, trace, TraceName } from '../../../../../../util/trace';
import { EARN_EXPERIENCES } from '../../../constants/experiences';
import useTronStakeApy from '../../../hooks/useTronStakeApy';
import styleSheet from './TronStakingLearnMoreModal.styles';

const TRON_STAKING_FAQ_URL =
  'https://support.metamask.io/metamask-portfolio/move-crypto/stake/';

const BodyText = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.bodyTextContainer}>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('stake.trx_learn_more.stake_any_amount')}{' '}
        <Text color={TextColor.Alternative}>
          {strings('stake.no_minimum_required')}
        </Text>
      </Text>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('stake.trx_learn_more.earn_trx_rewards')}{' '}
        <Text color={TextColor.Alternative}>
          {strings('stake.trx_learn_more.earn_trx_rewards_description')}
        </Text>
      </Text>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('stake.flexible_unstaking')}{' '}
        <Text color={TextColor.Alternative}>
          {strings('stake.trx_learn_more.flexible_unstaking_description')}
        </Text>
      </Text>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        style={styles.italicText}
      >
        {strings('stake.disclaimer')}
      </Text>
    </View>
  );
};

const TronStakingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const { apyPercent, isLoading } = useTronStakeApy();

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  useEffect(() => {
    trace({
      name: TraceName.EarnFaqApys,
      data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
    });
    endTrace({ name: TraceName.EarnFaq });
  }, []);

  useEffect(() => {
    if (!isLoading && apyPercent) {
      endTrace({ name: TraceName.EarnFaqApys });
    }
  }, [isLoading, apyPercent]);

  const redirectToLearnMore = () => {
    navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: TRON_STAKING_FAQ_URL,
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
      onPress: handleClose,
    },
  ];

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      <ScrollView bounces={false}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingSM}>
            {strings('stake.trx_learn_more.title')}
          </Text>
        </BottomSheetHeader>
        {apyPercent && (
          <View style={styles.apyContainer}>
            <Text variant={TextVariant.DisplayMD} color={TextColor.Success}>
              {apyPercent}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('stake.apr')}
            </Text>
          </View>
        )}
        <BodyText />
      </ScrollView>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default TronStakingLearnMoreModal;
