import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { TronStakingCtaTestIds } from './TronStakingCta.testIds';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { trace, TraceName } from '../../../../../../util/trace';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';

interface TronStakingCtaProps {
  asset: TokenI;
  aprText?: string;
}

const TronStakingCta = ({ asset, aprText }: TronStakingCtaProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isEligible } = useStakingEligibility();

  if (!isEligible) {
    return null;
  }

  const onStakePress = () => {
    trace({ name: TraceName.EarnDepositScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: asset },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.HOME_SCREEN,
          text: 'Stake',
          token: asset.symbol,
        })
        .build(),
    );
  };

  return (
    <Box
      padding={4}
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      twClassName="rounded-xl"
      testID={TronStakingCtaTestIds.CONTAINER}
    >
      <Box alignItems={BoxAlignItems.Center} marginBottom={4} gap={1}>
        <Text variant={TextVariant.HeadingMd} twClassName="text-center">
          {strings('stake.stake_your_trx_cta.title')}
        </Text>
        <Text twClassName="text-center">
          {strings('stake.stake_your_trx_cta.description_start')}
          {aprText ? (
            <Text color={TextColor.SuccessDefault}>{aprText}</Text>
          ) : null}
          {strings('stake.stake_your_trx_cta.description_end')}
        </Text>
      </Box>
      <Button
        testID={TronStakingCtaTestIds.EARN_BUTTON}
        variant={ButtonVariant.Secondary}
        isFullWidth
        onPress={onStakePress}
      >
        {strings('stake.stake_your_trx_cta.earn_button')}
      </Button>
    </Box>
  );
};

export default TronStakingCta;
