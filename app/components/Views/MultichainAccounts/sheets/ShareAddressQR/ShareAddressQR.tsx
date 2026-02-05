import React, { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
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
import { ShareAddressQRIds } from './ShareAddressQR.testIds';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { RootState } from '../../../../../reducers';

interface RootNavigationParamList extends ParamListBase {
  ShareAddressQR: {
    address: string;
    networkName: string;
    chainId: string;
    groupId: AccountGroupId;
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
  const { address, networkName, chainId, groupId } = route.params;
  const accountGroup = useSelector((state: RootState) =>
    selectAccountGroupById(state, groupId),
  );
  const accountGroupName = accountGroup?.metadata.name;

  const navigation = useNavigation();
  const { toBlockExplorer, getBlockExplorerName } = useBlockExplorer(chainId);
  const networkImageSource = getNetworkImageSource({ chainId });

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnBlockExplorer = useCallback(() => {
    toBlockExplorer(address);
  }, [address, toBlockExplorer]);

  return (
    <BottomSheet ref={sheetRef}>
      <HeaderCompactStandard
        title={`${accountGroupName} / ${networkName}`}
        onClose={handleOnBack}
        closeButtonProps={{ testID: ShareAddressQRIds.GO_BACK }}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-6"
      >
        <Box twClassName="p-6 border border-muted rounded-2xl bg-white">
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
            analyticsLocation="qr-code"
            chainId={chainId}
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
              explorer: getBlockExplorerName(),
            },
          )}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default ShareAddressQR;
