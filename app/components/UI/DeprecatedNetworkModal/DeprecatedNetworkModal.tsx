import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../component-library/hooks';
import { strings } from '../../../../locales/i18n';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import styleSheet from './DeprecatedNetworkModal.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { CONNECTING_TO_DEPRECATED_NETOWRK } from '../../../constants/urls';
import AnalyticsV2 from '../../../util/analyticsV2';

const DeprecatedNetworkModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);

  const dismissModal = (): void => {
    navigation.goBack();
  };

  const goToLearnMore = () => {
    Linking.openURL(CONNECTING_TO_DEPRECATED_NETOWRK);
    AnalyticsV2.trackEvent('EXTERNAL_LINK_CLICKED', {
      location: 'dapp_connection_request',
      text: 'Learn More',
      url_domain: CONNECTING_TO_DEPRECATED_NETOWRK,
    });
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.notch} />

        <View>
          <View>
            <Text
              variant={TextVariant.BodyLGMedium}
              style={styles.centeredTitle}
            >
              {strings('networks.network_deprecated_title')}
            </Text>
          </View>
          <View style={styles.descriptionContainer}>
            <Text>
              {strings('networks.network_deprecated_description')}{' '}
              <Text color={TextColor.Info} onPress={goToLearnMore}>
                {strings('accounts.learn_more')}
              </Text>
            </Text>
          </View>
          <View style={{ ...styles.footer }}>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              label="Got it"
              onPress={dismissModal}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </ReusableModal>
  );
};

export default DeprecatedNetworkModal;
