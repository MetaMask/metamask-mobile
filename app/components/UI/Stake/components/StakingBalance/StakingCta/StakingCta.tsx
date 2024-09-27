import React from 'react';
import { View, ViewProps } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './StakingCta.styles';
import Title from '../../../../../Base/Title';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import useTooltipModal from '../../../../../hooks/useTooltipModal';
import { strings } from '../../../../../../../locales/i18n';

const nonBreakingSpace = '\u00A0';

interface StakingCtaProps extends Pick<ViewProps, 'style'> {
  estimatedRewardRate: string;
}

const StakingCta = ({ estimatedRewardRate, style }: StakingCtaProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const onLearnMorePress = () =>
    openTooltipModal('TODO', "Connect to learn more component once it's ready");

  return (
    <View style={style}>
      <Title style={styles.title}>{strings('stake.stake_eth_and_earn')}</Title>
      <View style={styles.contentMain}>
        <Text>
          {strings('stake.stake_your_eth_cta.base')}
          {nonBreakingSpace}
        </Text>
        <Text color={TextColor.Success}>{estimatedRewardRate}</Text>
        <Text>
          {strings('stake.stake_your_eth_cta.annually')}
          {nonBreakingSpace}
        </Text>
        <Button
          label={strings('stake.stake_your_eth_cta.learn_more_with_period')}
          variant={ButtonVariants.Link}
          onPress={onLearnMorePress}
        />
      </View>
    </View>
  );
};

export default StakingCta;
