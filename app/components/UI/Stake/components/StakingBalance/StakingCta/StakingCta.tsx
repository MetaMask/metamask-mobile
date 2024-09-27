import React from 'react';
import { View, ViewProps } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './StakingCta.styles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';

interface StakingCtaProps extends Pick<ViewProps, 'style'> {
  estimatedRewardRate: string;
}

const StakingCta = ({ estimatedRewardRate, style }: StakingCtaProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const navigateToLearnMoreModal = () =>
    navigate('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
    });

  return (
    <View style={style}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('stake.stake_eth_and_earn')}
      </Text>
      <View style={styles.contentMain}>
        <Text style={styles.rightPad}>
          {strings('stake.stake_your_eth_cta.base')}
        </Text>
        <Text color={TextColor.Success}>{estimatedRewardRate}</Text>
        <Text style={styles.rightPad}>
          {strings('stake.stake_your_eth_cta.annually')}
        </Text>
        <Button
          label={strings('stake.stake_your_eth_cta.learn_more_with_period')}
          variant={ButtonVariants.Link}
          onPress={navigateToLearnMoreModal}
        />
      </View>
    </View>
  );
};

export default StakingCta;
