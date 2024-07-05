import React from 'react';
import { Pressable, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldStakingProvider } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import RemoteImage from '../../../../Base/RemoteImage';
import useCopyClipboard, {
  CopyClipboardAlertMessage,
} from '../hooks/useCopyClipboard';
import useStyles from '../useStyles';

type StakingProviderFieldProps = ModalFieldStakingProvider;

function StakingProviderField(props: StakingProviderFieldProps) {
  const { stakingProvider, tokenIconUrl, requestId } = props;
  const { styles } = useStyles();
  const copyToClipboard = useCopyClipboard();

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
      {requestId && (
        <Pressable
          style={styles.rightSection}
          onPress={() =>
            copyToClipboard(requestId, CopyClipboardAlertMessage.transaction())
          }
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
        >
          <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
            {strings('transaction.transaction_id')}
          </Text>
          <Icon
            color={IconColor.Primary}
            style={styles.copyIconRight}
            name={IconName.Copy}
            size={IconSize.Md}
          />
        </Pressable>
      )}
    </View>
  );
}

export default StakingProviderField;
