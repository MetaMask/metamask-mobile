// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader/SheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import SheetActionView from '../../../components/UI/SheetActionView';

// Internal dependencies
import createStyles from './ShowIpfsGatewaySheet.styles';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';

type ShowIpfsGatewaySheetProps = StackScreenProps<RootParamList, 'ShowIpfs'>;

const ShowIpfsGatewaySheet = ({ route }: ShowIpfsGatewaySheetProps) => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { setIpfsBannerVisible } = route.params;
  const handleSheetDismiss = () => null;

  const onConfirm = () => {
    const { PreferencesController } = Engine.context;
    sheetRef.current?.onCloseBottomSheet(() => {
      PreferencesController.setIsIpfsGatewayEnabled(true);
      setIpfsBannerVisible?.();
    });
  };

  const onCancel = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet onClose={handleSheetDismiss} ref={sheetRef}>
      <SheetHeader
        title={
          setIpfsBannerVisible
            ? strings('ipfs_gateway.ipfs_gateway_title')
            : strings('show_nft.show_nft_title')
        }
      />
      <Text style={styles.textContent}>
        {strings('show_nft.show_nft_content_1')}
        {'\n'}
        {'\n'}
        {<Text>{strings('show_nft.show_nft_content_2')}</Text>}{' '}
        <Text variant={TextVariant.BodyMDBold}>
          {' '}
          {strings('show_nft.show_nft_content_3')}
        </Text>{' '}
        {strings('show_nft.show_nft_content_4')}{' '}
        {
          <Text variant={TextVariant.BodyMDBold}>
            {strings('show_nft.show_nft_content_5')}
          </Text>
        }{' '}
        {strings('show_nft.show_nft_content_6')}
      </Text>

      <SheetActionView onCancel={onCancel} onConfirm={onConfirm} />
    </BottomSheet>
  );
};

export default ShowIpfsGatewaySheet;
