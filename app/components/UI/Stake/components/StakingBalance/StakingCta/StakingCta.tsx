import React from 'react';
import { View, ViewProps } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './StakingCta.styles';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../../constants/events';
import { Hex } from 'viem/_types/types/misc';
import { trace, TraceName } from '../../../../../../util/trace';
import { EARN_EXPERIENCES } from '../../../../Earn/constants/experiences';

interface StakingCtaProps extends Pick<ViewProps, 'style'> {
  estimatedRewardRate: string;
  chainId: Hex;
}

const StakingCta = ({
  estimatedRewardRate,
  style,
  chainId,
}: StakingCtaProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const navigateToLearnMoreModal = () => {
    trace({
      name: TraceName.EarnFaq,
      data: { experience: EARN_EXPERIENCES.POOLED_STAKING },
    });
    navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
      params: { chainId },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_LEARN_MORE_CLICKED)
        .addProperties({
          selected_provider: EVENT_PROVIDERS.CONSENSYS,
          text: 'Learn More',
          location: EVENT_LOCATIONS.TOKEN_DETAILS,
        })
        .build(),
    );
  };

  return (
    <View style={style}>
      <View style={styles.contentMain}>
        <Text>
          <Text>{strings('stake.stake_your_eth_cta.base')} </Text>
          <Text color={TextColor.Success}>{estimatedRewardRate}</Text>
          <Text>{` ${strings('stake.stake_your_eth_cta.annually')} `}</Text>
          <Text color={TextColor.Primary} onPress={navigateToLearnMoreModal}>
            {strings('stake.stake_your_eth_cta.learn_more_with_period')}
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default StakingCta;
