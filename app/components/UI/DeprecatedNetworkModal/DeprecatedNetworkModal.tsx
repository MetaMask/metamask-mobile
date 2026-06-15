import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { Linking, View } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import styleSheet from './DeprecatedNetworkModal.styles';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { CONNECTING_TO_DEPRECATED_NETWORK } from '../../../constants/urls';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { trackExternalLinkClicked } from '../../../util/analytics/externalLinkTracking';

const DeprecatedNetworkModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();

  const dismissModal = (): void => {
    navigation.goBack();
  };

  const goToLearnMore = () => {
    Linking.openURL(CONNECTING_TO_DEPRECATED_NETWORK);
    trackExternalLinkClicked(trackEvent, createEventBuilder, {
      location: 'dapp_connection_request',
      text: 'Learn More',
      url_domain: CONNECTING_TO_DEPRECATED_NETWORK,
    });
  };

  const sheetRef = useRef(null);

  return (
    <BottomSheet ref={sheetRef}>
      <Text variant={TextVariant.HeadingMd} style={styles.centeredTitle}>
        {strings('networks.network_deprecated_title')}
      </Text>
      <Text variant={TextVariant.BodyMd} style={styles.centeredDescription}>
        {strings('networks.network_deprecated_description')}{' '}
        <Text color={TextColor.InfoDefault} onPress={goToLearnMore}>
          {strings('accounts.learn_more')}
        </Text>
      </Text>
      <View style={{ ...styles.footer }}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={dismissModal}
          style={styles.button}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={styles.buttonLabel}
          >
            {strings('network_information.got_it')}
          </Text>
        </Button>
      </View>
    </BottomSheet>
  );
};

export default DeprecatedNetworkModal;
