import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { endTrace, trace, TraceName } from '../../../../../../util/trace';
import { EARN_EXPERIENCES } from '../../../constants/experiences';
import useTronStakeApy, { FetchStatus } from '../../../hooks/useTronStakeApy';
import styleSheet from './TronStakingLearnMoreModal.styles';
import {
  LearnMoreModalFooter,
  StakingInfoBodyText,
  StakingInfoStrings,
} from '../../../../Stake/components/LearnMoreModal';
import { TRON_STAKING_FAQ_URL } from '../../../../../../constants/urls';
import { AppStackNavigationProp } from '../../../../../../core/NavigationService/types';
import { useNavigation } from '@react-navigation/native';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../../../UI/Stake/constants/events';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';

const TronStakingLearnMoreModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);

  const { apyPercent, fetchStatus } = useTronStakeApy();

  const navigation = useNavigation<AppStackNavigationProp>();

  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleLearnMorePress = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Learn More',
          location: EVENT_LOCATIONS.LEARN_MORE_MODAL,
        })
        .build(),
    );

    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: TRON_STAKING_FAQ_URL,
        },
      });
    });
  };

  useEffect(() => {
    trace({
      name: TraceName.EarnFaqApys,
      data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
    });
    endTrace({ name: TraceName.EarnFaq });
  }, []);

  useEffect(() => {
    if (fetchStatus !== FetchStatus.Fetching && apyPercent) {
      endTrace({ name: TraceName.EarnFaqApys });
    }
  }, [fetchStatus, apyPercent]);

  const bodyTextStrings: StakingInfoStrings = useMemo(
    () => ({
      stakeAnyAmount: strings('stake.trx_learn_more.stake_any_amount'),
      noMinimumRequired: strings('stake.no_minimum_required'),
      earnRewards: strings('stake.trx_learn_more.earn_trx_rewards'),
      earnRewardsDescription: strings(
        'stake.trx_learn_more.earn_trx_rewards_description',
      ),
      flexibleUnstaking: strings('stake.flexible_unstaking'),
      flexibleUnstakingDescription: strings(
        'stake.trx_learn_more.flexible_unstaking_description',
      ),
      disclaimer: strings('stake.disclaimer'),
    }),
    [],
  );

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
        <StakingInfoBodyText strings={bodyTextStrings} styles={styles} />
      </ScrollView>
      <LearnMoreModalFooter
        onClose={handleClose}
        onLearnMorePress={handleLearnMorePress}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default TronStakingLearnMoreModal;
