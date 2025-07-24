import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';

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
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';

import styleSheet from './UnsupportedRegionModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

interface UnsupportedRegionModalNavigationDetails {
  onExitToWalletHome?: () => void;
  onSelectDifferentRegion?: () => void;
}

export const createUnsupportedRegionModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.UNSUPPORTED_REGION,
  );

function UnsupportedRegionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { onExitToWalletHome, onSelectDifferentRegion } =
    useParams<UnsupportedRegionModalNavigationDetails>();

  const { styles } = useStyles(styleSheet, {});

  const handleExitToWalletHome = useCallback(() => {
    if (onExitToWalletHome) {
      sheetRef.current?.onCloseBottomSheet(onExitToWalletHome);
    }
  }, [onExitToWalletHome]);

  const handleSelectDifferentRegion = useCallback(() => {
    if (onSelectDifferentRegion) {
      sheetRef.current?.onCloseBottomSheet(onSelectDifferentRegion);
    }
  }, [onSelectDifferentRegion]);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack isInteractable={false}>
      <BottomSheetHeader onClose={handleExitToWalletHome}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.unsupported_region_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            name={IconName.Warning}
            size={IconSize.Xl}
            color={styles.warningIcon.color}
          />
        </View>

        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('deposit.unsupported_region_modal.description')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={handleExitToWalletHome}
          label={strings(
            'deposit.unsupported_region_modal.exit_to_wallet_home',
          )}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
        <Button
          size={ButtonSize.Lg}
          onPress={handleSelectDifferentRegion}
          label={strings(
            'deposit.unsupported_region_modal.select_different_region',
          )}
          variant={ButtonVariants.Link}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default UnsupportedRegionModal;
