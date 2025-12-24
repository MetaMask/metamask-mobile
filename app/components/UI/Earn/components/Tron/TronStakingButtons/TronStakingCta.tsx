import React from 'react';
import { View, ViewProps } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './TronStakingCta.styles';

interface TronStakingCtaProps extends Pick<ViewProps, 'style'> {
  aprText?: string;
  onEarn?: () => void;
}

const TronStakingCta = ({ style, aprText, onEarn }: TronStakingCtaProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={[styles.container, style]}>
      <Text variant={TextVariant.HeadingMD}>
        {strings('stake.stake_your_trx_cta.title')}
      </Text>
      <View style={styles.row}>
        <Text>{strings('stake.stake_your_trx_cta.description_start')}</Text>
        {aprText ? <Text color={TextColor.Success}>{aprText}</Text> : null}
        <Text>{strings('stake.stake_your_trx_cta.description_end')}</Text>
      </View>
      {onEarn ? (
        <Button
          label={strings('stake.stake_your_trx_cta.learn_more')}
          variant={ButtonVariants.Link}
          onPress={onEarn}
        />
      ) : null}
    </View>
  );
};

export default TronStakingCta;
