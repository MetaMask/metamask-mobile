import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import QRAccountDisplay from '../../../QRAccountDisplay';
import QRCode from 'react-native-qrcode-svg';
import useBlockExplorer from '../../../../hooks/useBlockExplorer';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  getQrCodeViewedAccountType,
  trackQrCodeViewed,
} from '../../../../../util/analytics/qrCodeViewedTracking';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { getNetworkImageSource } from '../../../../../util/networks';
import { ShareAddressQRIds } from './ShareAddressQR.testIds';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { RootState } from '../../../../../reducers';

export interface ShareAddressQRParams {
  address: string;
  networkName: string;
  chainId: string;
  groupId: AccountGroupId;
  location: string;
  account: InternalAccount;
}

interface RootNavigationParamList extends ParamListBase {
  ShareAddressQR: ShareAddressQRParams;
}

type ShareAddressQRRouteProp = RouteProp<
  RootNavigationParamList,
  'ShareAddressQR'
>;

export const ShareAddressQR = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const route = useRoute<ShareAddressQRRouteProp>();
  const { address, networkName, chainId, groupId, location, account } =
    route.params;
  const accountGroup = useSelector((state: RootState) =>
    selectAccountGroupById(state, groupId),
  );
  const accountGroupName = accountGroup?.metadata.name;

  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toBlockExplorer, getBlockExplorerUrl, getBlockExplorerName } =
    useBlockExplorer(chainId);
  const networkImageSource = getNetworkImageSource({ chainId });
  const explorerButtonText = strings(
    'multichain_accounts.share_address.view_on_explorer_button',
    {
      explorer: getBlockExplorerName(),
    },
  );

  useEffect(() => {
    trackQrCodeViewed(trackEvent, createEventBuilder, {
      location,
      account_type: getQrCodeViewedAccountType(account),
      chain_id_caip: formatChainIdToCaip(chainId),
    });
  }, [account, chainId, createEventBuilder, location, trackEvent]);

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnBlockExplorer = useCallback(() => {
    const url = getBlockExplorerUrl(address);
    if (!url) {
      return;
    }
    trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
      location: 'share_address_qr',
      text: explorerButtonText,
      url,
    });
    toBlockExplorer(address);
  }, [
    address,
    createEventBuilder,
    explorerButtonText,
    getBlockExplorerUrl,
    toBlockExplorer,
    trackEvent,
  ]);

  return (
    <BottomSheet ref={sheetRef} goBack={handleOnBack}>
      <BottomSheetHeader
        onClose={handleOnBack}
        closeButtonProps={{ testID: ShareAddressQRIds.GO_BACK }}
      >
        {`${accountGroupName} / ${networkName}`}
      </BottomSheetHeader>
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
          {explorerButtonText}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default ShareAddressQR;
