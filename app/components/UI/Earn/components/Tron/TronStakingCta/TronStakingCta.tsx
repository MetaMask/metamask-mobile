import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTheme } from '../../../../../../util/theme';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import styleSheet from './TronStakingCta.styles';
import { TronStakingCtaTestIds } from './TronStakingCta.testIds';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { trace, TraceName } from '../../../../../../util/trace';

interface TronStakingCtaProps {
  asset: TokenI;
  aprText?: string;
}

const TronStakingCta = ({ asset, aprText }: TronStakingCtaProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

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
    <View style={styles.container} testID={TronStakingCtaTestIds.CONTAINER}>
      <View style={styles.ctaContent}>
        <Text variant={TextVariant.HeadingMD} style={styles.ctaTitle}>
          {strings('stake.stake_your_trx_cta.title')}
        </Text>
        <Text style={styles.ctaText}>
          {strings('stake.stake_your_trx_cta.description_start')}
          {aprText ? <Text color={TextColor.Success}>{aprText}</Text> : null}
          {strings('stake.stake_your_trx_cta.description_end')}
        </Text>
      </View>
      <Button
        testID={TronStakingCtaTestIds.EARN_BUTTON}
        style={styles.earnButton}
        variant={ButtonVariants.Secondary}
        label={strings('stake.stake_your_trx_cta.earn_button')}
        onPress={onStakePress}
      />
    </View>
  );
};

export default TronStakingCta;
