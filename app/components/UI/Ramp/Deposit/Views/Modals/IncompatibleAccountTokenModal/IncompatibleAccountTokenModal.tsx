import React, { useRef } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex, isHexString } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

import styleSheet from './IncompatibleAccountTokenModal.styles';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../../component-library/components/Buttons/Button';

import { useStyles } from '../../../../../../hooks/useStyles';
import { selectChainId } from '../../../../../../../selectors/networkController';
import { strings } from '../../../../../../../../locales/i18n';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../../../constants/networks';

function IncompatibleAccountTokenModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const chainId = useSelector(selectChainId);

  const { styles } = useStyles(styleSheet, {});

  const caipNetworkId = isHexString(chainId)
    ? toEvmCaipChainId(chainId as Hex)
    : chainId;
  const networkName = DEPOSIT_NETWORKS_BY_CHAIN_ID[caipNetworkId]?.name;

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {strings('deposit.incompatible_token_acount_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings('deposit.incompatible_token_acount_modal.description', {
            networkName,
          })}
        </Text>
        <Button
          size={ButtonSize.Lg}
          onPress={() => sheetRef.current?.onCloseBottomSheet()}
          label={strings('deposit.incompatible_token_acount_modal.cta')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default IncompatibleAccountTokenModal;
