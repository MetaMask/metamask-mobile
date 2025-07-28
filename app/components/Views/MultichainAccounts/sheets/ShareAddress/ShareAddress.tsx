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
import { Box } from '../../../../UI/Box/Box';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import styleSheet from './ShareAddress.styles';
import { useStyles } from '../../../../hooks/useStyles';
import QRAccountDisplay from '../../../QRAccountDisplay';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
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
  const { styles } = useStyles(styleSheet, {});
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

  const viewOnExplorerButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings(
      'multichain_accounts.share_address.view_on_explorer_button',
      {
        explorer:
          blockExplorer?.blockExplorerName ??
          strings('multichain_accounts.share_address.view_on_block_explorer'),
      },
    ),
    size: ButtonSize.Lg,
    onPress: handleExplorerLinkPress,
    testID: ShareAddressIds.SHARE_ADDRESS_VIEW_ON_EXPLORER_BUTTON,
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onBack={handleOnBack}>
        {strings('multichain_accounts.share_address.title')}
      </BottomSheetHeader>
      <Box
        style={styles.container}
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
      >
        <QRCode
          value={formattedAddress}
          size={200}
          logo={PNG_MM_LOGO_PATH}
          logoSize={40}
        />
        <QRAccountDisplay
          accountAddress={formattedAddress}
          addressContainerStyle={styles.addressContainer}
        />
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[viewOnExplorerButtonProps]}
      />
    </BottomSheet>
  );
};
