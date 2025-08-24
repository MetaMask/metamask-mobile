import React, { useCallback, useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Box } from '../../../../UI/Box/Box';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import styleSheet from './ShareAddressQR.styles';
import { useStyles } from '../../../../hooks/useStyles';
import QRAccountDisplay from '../../../QRAccountDisplay';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import QRCode from 'react-native-qrcode-svg';
import useCopyClipboard from '../../../Notifications/Details/hooks/useCopyClipboard';
import { getNetworkImageSource } from '../../../../../util/networks';
import { ShareAddressQRIds } from '../../../../../../e2e/selectors/MultichainAccounts/ShareAddressQR.selectors';

interface RootNavigationParamList extends ParamListBase {
  ShareAddressQR: {
    address: string;
    networkName: string;
    chainId: string;
    accountName: string;
  };
}

type ShareAddressQRRouteProp = RouteProp<
  RootNavigationParamList,
  'ShareAddressQR'
>;

export const ShareAddressQR = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});
  const route = useRoute<ShareAddressQRRouteProp>();
  const { address, networkName, accountName, chainId } = route.params;
  const navigation = useNavigation();
  const copyToClipboard = useCopyClipboard();
  const networkImageSource = getNetworkImageSource({ chainId });

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyAddress = useCallback(() => {
    copyToClipboard(address);
  }, [address, copyToClipboard]);

  const copyAddressButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('multichain_accounts.share_address_qr.copy_address'),
    size: ButtonSize.Lg,
    onPress: handleCopyAddress,
    testID: ShareAddressQRIds.SHARE_ADDRESS_QR_COPY_BUTTON,
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onBack={handleOnBack}>
        {`${accountName} / ${networkName}`}
      </BottomSheetHeader>
      <Box
        style={styles.container}
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
      >
        <QRCode
          value={address}
          size={200}
          logo={networkImageSource}
          logoSize={32}
          logoBorderRadius={8}
        />
        <Box style={styles.textContainer}>
          <Text
            variant={TextVariant.BodyLGMedium}
            color={TextColor.Default}
            style={styles.networkTitle}
          >
            {`${networkName} Address`}
          </Text>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
            style={styles.instructionText}
          >
            Use this address to receive tokens and collectibles on{' '}
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {networkName}
            </Text>
          </Text>
        </Box>
        <QRAccountDisplay
          accountAddress={address}
          addressContainerStyle={styles.addressContainer}
        />
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[copyAddressButtonProps]}
      />
    </BottomSheet>
  );
};
