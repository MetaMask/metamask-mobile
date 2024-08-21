import React from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { ModalFooterMobileLink } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import DeeplinkManager from '../../../../../core/DeeplinkManager/DeeplinkManager';
import parseDeeplink from '../../../../../core/DeeplinkManager/ParseManager/parseDeeplink';

type MobileLinkFooterProps = ModalFooterMobileLink;

export default function MobileLinkFooter(props: MobileLinkFooterProps) {
  const { styles } = useStyles();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  if (!props.mobileLink) {
    return null;
  }

  const { mobileLinkText, mobileLinkUrl } = props.mobileLink;

  const handlePress = () => {
    const deeplinkManager = new DeeplinkManager({
      navigation,
      dispatch,
    });

    const handled = parseDeeplink({
      deeplinkManager,
      url: mobileLinkUrl,
      origin: 'mobile-link',
    });

    if (!handled) {
      Linking.openURL(mobileLinkUrl);
    }
  };

  return (
    <Button
      variant={ButtonVariants.Secondary}
      label={mobileLinkText}
      style={styles.ctaBtn}
      onPress={handlePress}
    />
  );
}
