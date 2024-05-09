import React, { useEffect, useRef } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';

import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import ViewCardPlaceholder from '../../../../images/viewCard.png';
import { createStyles } from './styles';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

import VIEWS from './constants';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Routes from '../../../../constants/navigation/Routes';
import { walletUIUpdated } from '../../../../core/redux/slices/uiTheme';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';

const ViewSettings = ({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const isFullScreenModal = route?.params?.isFullScreenModal;
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChoosingView, setIsChoosingView] = React.useState(false);
  const uiTheme = useSelector((state: RootState) => state.uiTheme);
  const dispatch = useDispatch();
  useEffect(
    () => {
      navigation.setOptions(
        getNavigationOptionsTitle(
          strings('app_settings.views.title'),
          navigation,
          isFullScreenModal,
          colors,
          null,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  const onClose = () => {
    setIsChoosingView(false);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.onCloseBottomSheet();
    }
  };

  const onOpen = () => {
    setIsChoosingView(true);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.onOpenBottomSheet();
    }
  };

  const onChoose = (value: string) => {
    setIsChoosingView(true);
    dispatch(walletUIUpdated(value));
    navigation.navigate(Routes.WALLET.HOME);
  };

  const renderBottomSheet = () => (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      shouldNavigateBack={false}
    >
      <View style={styles.actionsContainer}>
        {Object.entries(VIEWS).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            onPress={() => onChoose(value)}
            style={[
              styles.viewRow,
              {
                backgroundColor: uiTheme.wallet === value && colors.info.muted,
              },
            ]}
          >
            <Icon
              name={IconName.ArrowRight}
              style={styles.icon}
              color={IconColor.Default}
              size={IconSize.Md}
            />
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );

  return (
    <>
      <View style={styles.wrapper}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.textTitle}
        >
          {strings('app_settings.views.settings.card.title')}
        </Text>
        <View style={styles.card}>
          <Image source={ViewCardPlaceholder} style={styles.image} />
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.textSpace}
        >
          {strings('app_settings.views.settings.card.description')}
        </Text>

        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('app_settings.views.settings.card.manage_preferences_1')}
          <Text variant={TextVariant.BodyMDBold} color={TextColor.Alternative}>
            {strings('app_settings.views.settings.card.manage_preferences_2')}
          </Text>
        </Text>

        <View style={styles.btnContainer}>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('app_settings.views.settings.card.cta')}
            onPress={onOpen}
            style={styles.ctaBtn}
          />
        </View>
      </View>
      {isChoosingView && renderBottomSheet()}
    </>
  );
};

export default ViewSettings;
