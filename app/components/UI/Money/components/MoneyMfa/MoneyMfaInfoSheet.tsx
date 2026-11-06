import React, { forwardRef, type ReactNode } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

interface MoneyMfaInfoSheetProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Buttons stacked under the description. */
  children: ReactNode;
  goBack: () => void;
  onClose: () => void;
  testID: string;
  /** Reported with the sheet's viewed event. */
  bottomSheetName: BOTTOM_SHEET_NAMES;
}

/**
 * Centred icon, title and description with buttons below: the layout shared
 * by the Money 2-step verification sheets.
 */
const MoneyMfaInfoSheet = forwardRef<BottomSheetRef, MoneyMfaInfoSheetProps>(
  (
    {
      icon,
      title,
      description,
      children,
      goBack,
      onClose,
      testID,
      bottomSheetName,
    },
    ref,
  ) => {
    const { trackBottomSheetViewed } = useMoneyAnalytics({
      bottom_sheet_name: bottomSheetName,
    });

    useMountEffect(trackBottomSheetViewed);

    return (
      <BottomSheet
        ref={ref}
        goBack={goBack}
        testID={testID}
        keyboardAvoidingViewEnabled={false}
      >
        <BottomSheetHeader onClose={onClose} />
        <Box twClassName="px-4 pb-4 gap-6">
          <Box twClassName="items-center gap-3">
            {icon}
            <Text variant={TextVariant.HeadingMd} twClassName="text-center">
              {title}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {description}
            </Text>
          </Box>
          <Box twClassName="gap-3">{children}</Box>
        </Box>
      </BottomSheet>
    );
  },
);

export default MoneyMfaInfoSheet;
