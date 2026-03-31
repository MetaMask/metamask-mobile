import {
  Box,
  BottomSheetHeader,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
  BottomSheet,
  BottomSheetRef,
} from '@metamask/design-system-react-native';
import React, { useCallback, useRef } from 'react';
import { Alert, Modal, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { Nft } from '@metamask/assets-controllers';
import Engine from '../../../core/Engine';
import { toHex } from '@metamask/controller-utils';

interface NftGridItemBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  nft: Nft | null;
}

const NftGridItemBottomSheet: React.FC<NftGridItemBottomSheetProps> = ({
  isVisible,
  onClose,
  nft,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleSheetClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const getNetworkClientId = useCallback((collectible: Nft) => {
    if (!collectible.chainId) return undefined;
    const { NetworkController } = Engine.context;
    return NetworkController.findNetworkClientIdByChainId(
      toHex(collectible.chainId),
    );
  }, []);

  const handleRemove = useCallback(() => {
    if (!nft) return;
    const networkClientId = getNetworkClientId(nft);
    if (!networkClientId) return;

    sheetRef.current?.onCloseBottomSheet();
    Engine.context.NftController.removeAndIgnoreNft(
      nft.address,
      nft.tokenId,
      networkClientId,
    );
    Alert.alert(
      strings('wallet.collectible_removed_title'),
      strings('wallet.collectible_removed_desc'),
    );
  }, [nft, getNetworkClientId]);

  const handleRefreshMetadata = useCallback(() => {
    if (!nft) return;
    const networkClientId = getNetworkClientId(nft);
    if (!networkClientId) return;

    sheetRef.current?.onCloseBottomSheet();
    Engine.context.NftController.addNft(
      nft.address,
      nft.tokenId,
      networkClientId,
    );
  }, [nft, getNetworkClientId]);

  if (!isVisible) return null;

  return (
    <View testID="nft-grid-item-bottom-sheet">
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <BottomSheet
          shouldNavigateBack={false}
          ref={sheetRef}
          onClose={onClose}
        >
          <BottomSheetHeader onClose={handleSheetClose}>
            <Text variant={TextVariant.HeadingMd}>
              {strings('wallet.collectible_action_title')}
            </Text>
          </BottomSheetHeader>

          <Box twClassName="pt-4 mx-4 flex gap-4">
            <Button
              onPress={handleRefreshMetadata}
              variant={ButtonVariant.Secondary}
              isFullWidth
              testID="nft-grid-item-bottom-sheet-refresh-button"
            >
              {strings('wallet.refresh_metadata')}
            </Button>
            <Button
              onPress={handleRemove}
              isFullWidth
              isDanger
              testID="nft-grid-item-bottom-sheet-remove-button"
            >
              {strings('wallet.remove')}
            </Button>
            <Button
              onPress={handleSheetClose}
              variant={ButtonVariant.Primary}
              isFullWidth
            >
              {strings('wallet.cancel')}
            </Button>
          </Box>
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default NftGridItemBottomSheet;
