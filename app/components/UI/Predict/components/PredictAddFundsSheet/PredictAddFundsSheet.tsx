import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { strings } from '../../../../../../locales/i18n';

// Internal dependencies.
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';

interface PredictAddFundsSheetProps {
  onDismiss?: () => void;
}

export interface PredictAddFundsSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}

const PredictAddFundsSheet = forwardRef<
  PredictAddFundsSheetRef,
  PredictAddFundsSheetProps
>(({ onDismiss }, ref) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { deposit } = usePredictDeposit();
  const { executeGuardedAction } = usePredictActionGuard({
    providerId: POLYMARKET_PROVIDER_ID,
    navigation,
  });

  const handleSheetClosed = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const closeSheet = useCallback(() => {
    if (!sheetRef.current) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }

    sheetRef.current.onCloseBottomSheet(() => {
      setIsVisible(false);
    });
  }, [onDismiss]);

  const handleClose = () => {
    closeSheet();
  };

  const handleAddFunds = () => {
    handleClose();
    executeGuardedAction(
      () => {
        deposit();
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.DEPOSIT },
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      onOpenBottomSheet: () => {
        if (!isVisible) {
          setIsVisible(true);
          return;
        }

        sheetRef.current?.onOpenBottomSheet();
      },
      onCloseBottomSheet: () => {
        closeSheet();
      },
    }),
    [closeSheet, isVisible],
  );

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      isInteractable
      onClose={handleSheetClosed}
    >
      <BottomSheetHeader onClose={handleClose} style={tw.style('px-6 py-4')}>
        <Text variant={TextVariant.HeadingMd} twClassName="text-default">
          {strings('predict.add_funds_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <Box
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Start}
        twClassName="px-6 pb-8"
      >
        <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
          {strings('predict.add_funds_sheet.description')}{' '}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonPropsArray={[
          {
            variant: ButtonVariants.Primary,
            label: strings('predict.add_funds_sheet.title'),
            onPress: handleAddFunds,
          },
        ]}
        style={tw.style('px-6')}
      />
    </BottomSheet>
  );
});

export default PredictAddFundsSheet;
