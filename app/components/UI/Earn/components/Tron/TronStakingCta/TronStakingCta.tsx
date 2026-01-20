import React from 'react';
import { useSelector } from 'react-redux';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTheme } from '../../../../../../util/theme';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import styleSheet from './TronStakingCta.styles';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { trace, TraceName } from '../../../../../../util/trace';
import { RootState } from '../../../../../../reducers';
import { selectAsset } from '../../../../../../selectors/assets/assets-list';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';

interface TronStakingCtaProps {
  asset: TokenI;
  aprText?: string;
}

const TronStakingCta = ({ asset, aprText }: TronStakingCtaProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { isEligible } = useStakingEligibility();

  const isStakedTrx =
    asset?.isStaked || asset?.symbol === 'sTRX' || asset?.ticker === 'sTRX';

  const unstakedTrxAsset = useSelector((state: RootState) =>
    isStakedTrx && asset?.address && asset?.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );

  const baseAssetForStake = React.useMemo(
    () =>
      !isStakedTrx ? asset : (unstakedTrxAsset ?? asset.nativeAsset ?? asset),
    [asset, isStakedTrx, unstakedTrxAsset],
  );

  const onStakePress = () => {
    trace({ name: TraceName.EarnDepositScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAssetForStake },
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

  // Block deposits for ineligible users
  if (!isEligible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.ctaContent}>
        <Text style={styles.ctaText}>
          {strings('stake.stake_your_trx_cta.description_start')}
          {aprText ? <Text color={TextColor.Success}>{aprText}</Text> : null}
          {strings('stake.stake_your_trx_cta.description_end')}
        </Text>
      </View>
      <Button
        testID={'stake-button'}
        style={styles.stakeButton}
        variant={ButtonVariants.Secondary}
        label={strings('stake.stake_your_trx_cta.stake_button')}
        onPress={onStakePress}
      />
    </View>
  );
};

export default TronStakingCta;
