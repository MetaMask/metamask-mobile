import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import { View } from 'react-native';
import {
  BannerAlert,
  BannerAlertSeverity,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

const IPFS_BANNER_CLOSE_BUTTON_TEST_ID = 'ipfs-banner-close-button';

const IpfsBanner = ({
  setIpfsBannerVisible,
}: {
  setIpfsBannerVisible: (isVisible: boolean) => void;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();

  const handleTurnOnIpfsGateway = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SHOW_IPFS,
      params: {
        setIpfsBannerVisible: () => setIpfsBannerVisible(false),
      },
    });
  }, [navigation, setIpfsBannerVisible]);

  return (
    <View style={styles.bannerContainer}>
      <BannerAlert
        severity={BannerAlertSeverity.Info}
        title={strings('ipfs_gateway_banner.ipfs_gateway_banner_title')}
        description={
          <Text>
            {strings('ipfs_gateway_banner.ipfs_gateway_banner_content1')}{' '}
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {strings('ipfs_gateway_banner.ipfs_gateway_banner_content2')}
            </Text>{' '}
            {strings('ipfs_gateway_banner.ipfs_gateway_banner_content3')}{' '}
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {strings('ipfs_gateway_banner.ipfs_gateway_banner_content4')}
            </Text>
          </Text>
        }
        actionButtonLabel="Turn on IPFS gateway"
        actionButtonOnPress={handleTurnOnIpfsGateway}
        onClose={() => setIpfsBannerVisible(false)}
        closeButtonProps={{ testID: IPFS_BANNER_CLOSE_BUTTON_TEST_ID }}
      />
    </View>
  );
};

export default IpfsBanner;
