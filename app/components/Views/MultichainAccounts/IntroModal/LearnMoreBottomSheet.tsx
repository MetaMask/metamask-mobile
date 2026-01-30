import React, { useState, useCallback, useRef } from 'react';
import { View } from 'react-native';
import {
  Text,
  ButtonIcon,
  TextVariant,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../component-library/components/Checkbox';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import {
  useNavigation,
  useTheme,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './LearnMoreBottomSheet.styles';
import Routes from '../../../../constants/navigation/Routes';
import { RootState } from '../../../../reducers';
import { useDispatch, useSelector } from 'react-redux';
import { setMultichainAccountsIntroModalSeen } from '../../../../actions/user';
import type { RootParamList } from '../../../../util/navigation/types';

type LearnMoreBottomSheetRouteProp = RouteProp<
  RootParamList,
  'MultichainAccountsLearnMoreBottomSheet'
>;

const LearnMoreBottomSheet: React.FC = () => {
  const route = useRoute<LearnMoreBottomSheetRouteProp>();
  const onClose = route.params?.onClose;
  const { styles } = useStyles(styleSheet, { theme: useTheme() });
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );

  const handleBack = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleCheckboxToggle = useCallback(() => {
    setIsCheckboxChecked(!isCheckboxChecked);
  }, [isCheckboxChecked]);

  const handleConfirm = useCallback(() => {
    if (isCheckboxChecked) {
      navigation.goBack(); // close bottom sheet
      navigation.goBack(); // close modal
      if (isBasicFunctionalityEnabled) {
        dispatch(setMultichainAccountsIntroModalSeen(true));
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        });
      }
    }
  }, [isCheckboxChecked, navigation, isBasicFunctionalityEnabled, dispatch]);

  return (
    <BottomSheet ref={sheetRef} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            onPress={handleBack}
            iconName={IconName.ArrowLeft}
            testID="learn-more-back-button"
          />
          <Text
            variant={TextVariant.HeadingMd}
            style={styles.title}
            testID="learn-more-title"
          >
            {strings('multichain_accounts.learn_more.title')}
          </Text>
          <ButtonIcon
            onPress={handleClose}
            iconName={IconName.Close}
            testID="learn-more-close-button"
          />
        </View>

        <View style={styles.content}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={styles.description}
            testID="learn-more-description"
          >
            {strings('multichain_accounts.learn_more.description')}
          </Text>

          <Checkbox
            isChecked={isCheckboxChecked}
            onPress={handleCheckboxToggle}
            label={strings('multichain_accounts.learn_more.checkbox_label')}
            testID="learn-more-checkbox"
          />
        </View>

        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('multichain_accounts.learn_more.confirm_button')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleConfirm}
            isDisabled={!isCheckboxChecked}
            testID="learn-more-confirm-button"
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default LearnMoreBottomSheet;
