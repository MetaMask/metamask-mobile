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
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Button,
  ButtonVariant,
  ButtonSize,
  TextVariant,
  TextColor,
  FontWeight,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import QRAccountDisplay from '../../../QRAccountDisplay';
import QRCode from 'react-native-qrcode-svg';
import useBlockExplorer from '../../../../hooks/useBlockExplorer';
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
  const tw = useTailwind();
  const route = useRoute<ShareAddressQRRouteProp>();
  const { address, networkName, accountName, chainId } = route.params;
  const navigation = useNavigation();
  const { toBlockExplorer } = useBlockExplorer();
  const networkImageSource = getNetworkImageSource({ chainId });

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnBlockExplorer = useCallback(() => {
    toBlockExplorer(address);
  }, [address, toBlockExplorer]);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onBack={handleOnBack}>
        {`${accountName} / ${networkName}`}
      </BottomSheetHeader>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-6"
      >
        <Box twClassName="p-6 border border-muted rounded-2xl">
          <QRCode
            value={address}
            size={200}
            logo={networkImageSource}
            logoSize={32}
            logoBorderRadius={8}
          />
        </Box>
        <Box twClassName="mt-6 mb-4">
          <QRAccountDisplay
            accountAddress={address}
            label={strings('multichain_accounts.share_address_qr.title', {
              networkName,
            })}
            description={
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={tw.style('px-4 text-center')}
              >
                {strings(
                  'multichain_accounts.share_address_qr.description_prefix',
                )}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                >
                  {networkName}
                </Text>
                .
              </Text>
            }
            labelProps={{
              variant: TextVariant.BodyLg,
              fontWeight: FontWeight.Medium,
            }}
            descriptionProps={{
              variant: TextVariant.BodyMd,
              color: TextColor.TextAlternative,
            }}
          />
        </Box>
      </Box>
      <Box twClassName="px-4 pb-4">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleViewOnBlockExplorer}
          testID={ShareAddressQRIds.SHARE_ADDRESS_QR_COPY_BUTTON}
          style={tw.style('mt-1 self-center')}
        >
          {strings(
            'multichain_accounts.share_address.view_on_explorer_button',
            {
              explorer: 'Etherscan (Multichain)',
            },
          )}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default ShareAddressQR;
