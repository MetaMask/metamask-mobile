import React, { useRef } from 'react';
// import { View } from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
// import Button, {
//   ButtonSize,
//   ButtonVariants,
//   ButtonWidthTypes,
// } from '../../../../../../../component-library/components/Buttons/Button';

import styleSheet from './IncompatibleAccountTokenModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

export const createIncompatibleAccountTokenModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.INCOMPATIBLE_ACCOUNT_TOKEN,
  );

function IncompatibleAccountTokenModal() {
  const sheetRef = useRef<BottomSheetRef>(null);

  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {strings('deposit.incompatible_token_acount_modal.title')} or a very
          wordy title in here, like a lot of wording
        </Text>
      </BottomSheetHeader>

      <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
        {strings('deposit.incompatible_token_acount_modal.description')}
      </Text>

      {/* <View>
        <Button
          size={ButtonSize.Lg}
          onPress={() => {}}
          label={strings('deposit.unsupported_region_modal.change_region')}
          variant={ButtonVariants.Link}
          width={ButtonWidthTypes.Full}
        />
        <Button
          size={ButtonSize.Lg}
          onPress={() => {}}
          label={strings('deposit.unsupported_region_modal.buy_crypto')}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View> */}
    </BottomSheet>
  );
}

export default IncompatibleAccountTokenModal;
