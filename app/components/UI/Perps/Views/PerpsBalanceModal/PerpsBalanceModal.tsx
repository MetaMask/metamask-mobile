import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsNavigationParamList } from '../../controllers/types';
import { usePerpsTrading, usePerpsNetworkManagement } from '../../hooks';
import createStyles from './PerpsBalanceModal.styles';
import { PerpsTabViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';

interface PerpsBalanceModalProps {}

const PerpsBalanceModal: React.FC<PerpsBalanceModalProps> = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { navigateToConfirmation } = useConfirmNavigation();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddFunds = useCallback(async () => {
    try {
      // Ensure the network exists before proceeding
      await ensureArbitrumNetworkExists();

      navigation.goBack();

      // Navigate immediately to confirmations screen for instant UI response
      navigateToConfirmation({ stack: Routes.PERPS.ROOT });

      // Initialize deposit in the background without blocking
      depositWithConfirmation().catch((error) => {
        console.error('Failed to initialize deposit:', error);
      });
    } catch (error) {
      console.error('Failed to proceed with deposit:', error);
    }
  }, [
    depositWithConfirmation,
    ensureArbitrumNetworkExists,
    navigation,
    navigateToConfirmation,
  ]);

  const handleWithdrawFunds = useCallback(async () => {
    try {
      // Ensure the network exists before proceeding
      await ensureArbitrumNetworkExists();

      navigation.goBack();
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });
    } catch (error) {
      console.error('Failed to proceed with withdraw:', error);
    }
  }, [navigation, ensureArbitrumNetworkExists]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={handleClose}
      shouldNavigateBack={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.manage_balance')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.add_funds')}
          onPress={handleAddFunds}
          style={styles.actionButton}
          startIconName={IconName.Add}
          testID={PerpsTabViewSelectorsIDs.ADD_FUNDS_BUTTON}
        />
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('perps.withdraw')}
          onPress={handleWithdrawFunds}
          style={styles.actionButton}
          startIconName={IconName.Minus}
        />
      </View>
    </BottomSheet>
  );
};

export default PerpsBalanceModal;
