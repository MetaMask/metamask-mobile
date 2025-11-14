import React from 'react';
import { View, ViewProps } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';

const styles = {
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
} as const;

interface TronStakingCtaProps extends Pick<ViewProps, 'style'> {
  aprText?: string;
  onLearnMore?: () => void;
}

const TronStakingCta = ({
  style,
  aprText,
  onLearnMore,
}: TronStakingCtaProps) => (
  <View style={style}>
    <Text variant={TextVariant.HeadingMD}>{strings('stake.earn')}</Text>
    <View style={styles.row}>
      <Text>{strings('stake.stake_your_trx_cta.base')} </Text>
      {aprText ? (
        <>
          <Text color={TextColor.Success}>{aprText}</Text>
          <Text>{` ${strings('stake.stake_your_trx_cta.annually')} `}</Text>
        </>
      ) : null}
      {onLearnMore ? (
        <Button
          label={strings('stake.stake_your_trx_cta.learn_more_with_period')}
          variant={ButtonVariants.Link}
          onPress={onLearnMore}
        />
      ) : null}
    </View>
  </View>
);

export default TronStakingCta;
