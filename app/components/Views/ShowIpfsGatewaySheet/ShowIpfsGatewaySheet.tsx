import React, { useRef } from 'react';

import { SheetBottomRef } from '../../../component-library/components/Sheet/SheetBottom';
import SheetBottom from '../../../component-library/components/Sheet/SheetBottom/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader/SheetHeader';
import Text from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import createStyles from './ShowIpfsGatewaySheet.styles';
import { useParams } from '../../../util/navigation/navUtils';
import { ShowIpfsGatewaySheetParams } from './ShowIpfsGatewaySheet.types';
import SheetActionView from '../../../components/UI/SheetActionView';

const ShowIpfsGatewaySheet = () => {
  const styles = createStyles();
  const sheetRef = useRef<SheetBottomRef>(null);
  const { setIpfsBannerVisible } = useParams<ShowIpfsGatewaySheetParams>();
  const handleSheetDismiss = () => null;

  const onConfirm = () => {
    const { PreferencesController } = Engine.context;
    sheetRef.current?.hide(() => {
      PreferencesController.setIsIpfsGatewayEnabled(true);
      setIpfsBannerVisible?.();
    });
  };

  const onCancel = () => {
    sheetRef.current?.hide();
  };

  return (
    <SheetBottom onDismissed={handleSheetDismiss} ref={sheetRef}>
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
    </SheetBottom>
  );
};

export default ShowIpfsGatewaySheet;
