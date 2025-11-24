import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldStakingProvider } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import RemoteImage from '../../../../Base/RemoteImage';
import useStyles from '../useStyles';

type StakingProviderFieldProps = ModalFieldStakingProvider;

function StakingProviderField(props: StakingProviderFieldProps) {
  const { stakingProvider, tokenIconUrl } = props;
  const { styles } = useStyles();

  return (
    <View style={styles.row}>
      <RemoteImage
        source={{
          uri: tokenIconUrl,
        }}
        style={styles.circleLogo}
        placeholderStyle={styles.circleLogoPlaceholder}
      />
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('notifications.staking_provider')}
        </Text>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {stakingProvider}
        </Text>
      </View>
    </View>
  );
}

export default StakingProviderField;
