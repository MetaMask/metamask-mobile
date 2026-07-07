import React, { useCallback, useMemo, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonsAlignment,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

interface MarketInsightsDisclaimerBottomSheetProps {
  onClose: () => void;
}

const MarketInsightsDisclaimerBottomSheet: React.FC<
  MarketInsightsDisclaimerBottomSheetProps
> = ({ onClose }) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const surfaceClass = useElevatedSurface();

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('market_insights.disclaimer_modal.got_it'),
      onPress: handleClose,
      size: ButtonSize.Lg,
      variant: ButtonVariant.Primary,
    }),
    [handleClose],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader onClose={handleClose}>
        {strings('market_insights.disclaimer_modal.title')}
      </BottomSheetHeader>

      <Box paddingHorizontal={4}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('market_insights.disclaimer_modal.body')}
        </Text>
      </Box>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-6"
      />
    </BottomSheet>
  );
};

export default MarketInsightsDisclaimerBottomSheet;
