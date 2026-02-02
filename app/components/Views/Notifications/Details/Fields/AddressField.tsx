import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldAddress } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import EthereumAddress from '../../../../UI/EthereumAddress';
import useCopyClipboard, {
  CopyClipboardAlertMessage,
} from '../hooks/useCopyClipboard';
import useStyles from '../useStyles';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';

type AddressFieldProps = ModalFieldAddress;

function AddressField(props: AddressFieldProps) {
  const { label, address } = props;
  const { styles } = useStyles();
  const copyToClipboard = useCopyClipboard();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const accountAvatarType = useSelector(selectAvatarAccountType);

  const handleCopy = () => {
    copyToClipboard(address, CopyClipboardAlertMessage.address());

    trackEvent(
      createEventBuilder(EVENT_NAME.WALLET_COPIED_ADDRESS)
        .addProperties({
          location: 'notification-details',
        })
        .build(),
    );
  };

  return (
    <View style={styles.row}>
      <Avatar
        variant={AvatarVariant.Account}
        type={accountAvatarType}
        accountAddress={address}
        size={AvatarSize.Md}
        style={styles.badgeWrapper}
      />
      <View style={styles.boxLeft}>
        <Text variant={TextVariant.BodyLGMedium}>{label}</Text>
        <Pressable
          onPress={handleCopy}
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
          style={styles.copyContainer}
          testID="address-field-copy-button"
        >
          <EthereumAddress
            style={styles.addressLinkLabel}
            address={address}
            type={'short'}
          />
          <Icon
            style={styles.copyIconDefault as ViewStyle}
            name={IconName.Copy}
            size={IconSize.Md}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default AddressField;
