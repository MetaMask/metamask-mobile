import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import { View } from 'react-native';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../component-library/components/Banners/Banner';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';

const IpfsBanner = ({
  setIpfsBannerVisible,
}: {
  setIpfsBannerVisible: (isVisible: boolean) => void;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  return (
    <View style={styles.bannerContainer}>
      <Banner
        title={strings('ipfs_gateway_banner.ipfs_gateway_banner_title')}
        description={
          <Text>
            {strings('ipfs_gateway_banner.ipfs_gateway_banner_content1')}{' '}
            <Text variant={TextVariant.BodyMDBold}>
              {strings('ipfs_gateway_banner.ipfs_gateway_banner_content2')}
            </Text>{' '}
            {strings('ipfs_gateway_banner.ipfs_gateway_banner_content3')}{' '}
            <Text variant={TextVariant.BodyMDBold}>
              {strings('ipfs_gateway_banner.ipfs_gateway_banner_content4')}
            </Text>
          </Text>
        }
        actionButtonProps={{
          variant: ButtonVariants.Link,
          onPress: () =>
            navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.SHEET.SHOW_IPFS,
              params: {
                setIpfsBannerVisible: () => setIpfsBannerVisible(false),
              },
            }),
          label: 'Turn on IPFS gateway',
        }}
        variant={BannerVariant.Alert}
        severity={BannerAlertSeverity.Info}
        onClose={() => setIpfsBannerVisible(false)}
      />
    </View>
  );
};

export default IpfsBanner;
