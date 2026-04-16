import React, { useCallback, useRef, useState } from 'react';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { LimitType } from '../../../types';
import { sanitizeCustomLimit } from '../../../util/sanitizeCustomLimit';
import LimitOptionItem from './LimitOptionItem';
import { AppNavigationProp } from '../../../../../../core/NavigationService/types';

interface SpendingLimitOptionsNavigationDetails {
  currentLimitType: LimitType;
  currentCustomLimit: string;
  callerRoute: string;
  callerParams?: Record<string, unknown>;
}

export const createSpendingLimitOptionsNavigationDetails =
  createNavigationDetails<SpendingLimitOptionsNavigationDetails>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.SPENDING_LIMIT_OPTIONS,
  );

const SpendingLimitOptionsSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { currentLimitType, currentCustomLimit, callerRoute, callerParams } =
    useParams<SpendingLimitOptionsNavigationDetails>();

  const [limitType, setLimitType] = useState<LimitType>(currentLimitType);
  const [customLimit, setCustomLimitState] = useState(currentCustomLimit);

  const setCustomLimit = useCallback((value: string) => {
    setCustomLimitState(sanitizeCustomLimit(value));
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(callerRoute, {
        ...callerParams,
        returnedLimitType: limitType,
        returnedCustomLimit: customLimit,
      });
    });
  }, [navigation, callerRoute, callerParams, limitType, customLimit]);

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('card.card_spending_limit.restricted_limit_title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-2">
        <LimitOptionItem
          title={strings('card.card_spending_limit.full_access_title')}
          description={strings(
            'card.card_spending_limit.full_access_description',
          )}
          isSelected={limitType === 'full'}
          onPress={() => setLimitType('full')}
          testID="limit-option-full"
        />

        <LimitOptionItem
          title={strings('card.card_spending_limit.restricted_limit_title')}
          description={strings(
            'card.card_spending_limit.restricted_limit_description',
          )}
          isSelected={limitType === 'restricted'}
          onPress={() => setLimitType('restricted')}
          showInput
          inputValue={customLimit}
          onInputChange={setCustomLimit}
          testID="limit-option-restricted"
        />
      </Box>

      <Box twClassName="px-4 pb-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleConfirm}
          isFullWidth
        >
          {strings('card.card_spending_limit.confirm_new_limit')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default SpendingLimitOptionsSheet;
