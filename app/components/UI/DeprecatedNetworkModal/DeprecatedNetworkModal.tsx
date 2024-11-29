import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { Linking, View } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import styleSheet from './DeprecatedNetworkModal.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { CONNECTING_TO_DEPRECATED_NETWORK } from '../../../constants/urls';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';

const DeprecatedNetworkModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();

  const dismissModal = (): void => {
    navigation.goBack();
  };

  const goToLearnMore = () => {
    Linking.openURL(CONNECTING_TO_DEPRECATED_NETWORK);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EXTERNAL_LINK_CLICKED)
        .addProperties({
          location: 'dapp_connection_request',
          text: 'Learn More',
          url_domain: CONNECTING_TO_DEPRECATED_NETWORK,
        })
        .build(),
    );
  };

  const sheetRef = useRef(null);

  return (
    <BottomSheet ref={sheetRef}>
      <Text variant={TextVariant.HeadingMD} style={styles.centeredTitle}>
        {strings('networks.network_deprecated_title')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.centeredDescription}>
        {strings('networks.network_deprecated_description')}{' '}
        <Text color={TextColor.Info} onPress={goToLearnMore}>
          {strings('accounts.learn_more')}
        </Text>
      </Text>
      <View style={{ ...styles.footer }}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={dismissModal}
          style={styles.button}
          label={
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              style={styles.buttonLabel}
            >
              {strings('network_information.got_it')}
            </Text>
          }
        />
      </View>
    </BottomSheet>
  );
};

export default DeprecatedNetworkModal;
