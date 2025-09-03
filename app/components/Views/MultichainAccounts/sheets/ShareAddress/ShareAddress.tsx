import React, { useCallback, useMemo, useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { InternalAccount } from '@metamask/keyring-internal-api';
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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import QRAccountDisplay from '../../../QRAccountDisplay';
import QRCode from 'react-native-qrcode-svg';
import { getFormattedAddressFromInternalAccount } from '../../../../../core/Multichain/utils';
import { getMultichainBlockExplorer } from '../../../../../core/Multichain/networks';
import { ShareAddressIds } from '../../../../../../e2e/selectors/MultichainAccounts/ShareAddress.selectors';
import PNG_MM_LOGO_PATH from '../../../../../images/branding/fox.png';

interface RootNavigationParamList extends ParamListBase {
  ShareAddress: {
    account: InternalAccount;
  };
}

type ShareAddressRouteProp = RouteProp<RootNavigationParamList, 'ShareAddress'>;

export const ShareAddress = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const route = useRoute<ShareAddressRouteProp>();
  const { account } = route.params;
  const navigation = useNavigation();
  const formattedAddress = getFormattedAddressFromInternalAccount(account);

  const blockExplorer:
    | {
        url: string;
        title: string;
        blockExplorerName: string;
      }
    | undefined = useMemo(() => getMultichainBlockExplorer(account), [account]);

  const handleExplorerLinkPress = useCallback(() => {
    if (blockExplorer) {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: blockExplorer.url,
          title: blockExplorer.title,
        },
      });
    }
  }, [blockExplorer, navigation]);

  const handleOnBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onBack={handleOnBack}>
        {strings('multichain_accounts.share_address.title')}
      </BottomSheetHeader>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-6"
      >
        <Box twClassName="p-6 border border-muted rounded-2xl">
          <QRCode
            value={formattedAddress}
            size={200}
            logo={PNG_MM_LOGO_PATH}
            logoSize={32}
            logoBorderRadius={8}
          />
        </Box>
        <Box twClassName="mt-6 mb-4">
          <QRAccountDisplay accountAddress={formattedAddress} />
        </Box>
      </Box>
      <Box twClassName="px-4 pb-4">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleExplorerLinkPress}
          testID={ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON}
          style={tw.style('mt-1 self-center')}
        >
          {strings(
            'multichain_accounts.share_address.view_on_explorer_button',
            {
              explorer:
                blockExplorer?.blockExplorerName ??
                strings(
                  'multichain_accounts.share_address.view_on_block_explorer',
                ),
            },
          )}
        </Button>
      </Box>
    </BottomSheet>
  );
};
