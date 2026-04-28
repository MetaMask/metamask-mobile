import React, { useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import AppConstants from '../../../../../core/AppConstants';
import createStyles from './FiatOnTestnetsFriction.styles';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../Base/Text';
import { useDispatch } from 'react-redux';
import { setShowFiatOnTestnets } from '../../../../../../app/actions/settings';
import { FiatOnTestnetsBottomSheetSelectorsIDs } from './FiatOnTestnetsBottomSheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const FiatOnTestnetsFriction = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.frictionContainer}>
        <Icon
          name={IconName.Danger}
          color={colors.warning.default}
          size={IconSize.Xl}
        />
        <Text style={styles.heading}>
          {strings('app_settings.show_fiat_on_testnets_modal_title')}
        </Text>
        <Text style={styles.descriptionText}>
          <Text>
            {strings(
              'app_settings.show_fiat_on_testnets_modal_description',
            )}{' '}
          </Text>
          <Text
            primary
            noMargin
            link
            accessibilityRole={'link'}
            accessible
            onPress={() =>
              navigation.navigate(Routes.WEBVIEW.MAIN, {
                screen: Routes.WEBVIEW.SIMPLE,
                params: { url: AppConstants.URLS.TESTNET_ETH_SCAMS },
              })
            }
          >
            {strings('app_settings.show_fiat_on_testnets_modal_learn_more')}
          </Text>
        </Text>
        <View style={styles.buttonsContainer}>
          <Button
            testID={FiatOnTestnetsBottomSheetSelectorsIDs.CANCEL_BUTTON}
            variant={ButtonVariant.Secondary}
            isFullWidth
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            accessible
            onPress={() => sheetRef.current?.onCloseBottomSheet()}
          >
            {strings('navigation.cancel')}
          </Button>
          <Button
            testID={FiatOnTestnetsBottomSheetSelectorsIDs.CONTINUE_BUTTON}
            variant={ButtonVariant.Primary}
            isFullWidth
            size={ButtonSize.Lg}
            style={styles.button}
            accessibilityRole={'button'}
            onPress={() => {
              dispatch(setShowFiatOnTestnets(true));
              sheetRef.current?.onCloseBottomSheet();
            }}
          >
            {strings('app_settings.show_fiat_on_testnets_modal_button')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default FiatOnTestnetsFriction;
