import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { OnboardingSelectorIDs } from '../../../../e2e/selectors/Onboarding/Onboarding.selectors';

export interface OnboardingSheetParams {
  onPressCreate?: () => void;
  onPressImport?: () => void;
  onPressContinueWithGoogle?: () => void;
  onPressContinueWithApple?: () => void;
  createWallet?: boolean;
}

export interface OnboardingSheetProps {
  route: {
    params: OnboardingSheetParams;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.muted,
    },
    bottomSheetContainer: {
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialBtn: {
      borderColor: colors.border.muted,
      borderWidth: 1,
      color: colors.text.default,
    },
    buttonWrapper: {
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 16,
      width: '100%',
    },
    buttonLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
  });

const OnboardingSheet = (props: OnboardingSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const {
    onPressCreate,
    onPressImport,
    onPressContinueWithGoogle,
    onPressContinueWithApple,
    createWallet = false,
  } = props.route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const onPressCreateAction = () => {
    if (onPressCreate) {
      onPressCreate();
    }
  };

  const onPressImportAction = () => {
    if (onPressImport) {
      onPressImport();
    }
  };

  const onPressContinueWithGoogleAction = () => {
    if (onPressContinueWithGoogle) {
      onPressContinueWithGoogle();
    }
  };

  const onPressContinueWithAppleAction = () => {
    if (onPressContinueWithApple) {
      onPressContinueWithApple();
    }
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.bottomSheetContainer}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('onboarding.bottom_sheet_title')}
        </Text>
        <View style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariants.Secondary}
            overridePressedColor={colors.background.alternative}
            onPress={onPressContinueWithGoogleAction}
            testID={OnboardingSelectorIDs.NEW_WALLET_BUTTON}
            label={
              <View style={styles.buttonLabel}>
                <Icon
                  name={IconName.Google}
                  size={IconSize.Lg}
                  color={TextColor.Default}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {createWallet
                    ? strings('onboarding.continue_with_google')
                    : strings('onboarding.sign_in_with_google')}
                </Text>
              </View>
            }
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.socialBtn}
          />
          <Button
            variant={ButtonVariants.Secondary}
            overridePressedColor={colors.background.alternative}
            onPress={onPressContinueWithAppleAction}
            testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
            label={
              <View style={styles.buttonLabel}>
                <Icon
                  name={IconName.Apple}
                  size={IconSize.Lg}
                  color={TextColor.Default}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {createWallet
                    ? strings('onboarding.continue_with_apple')
                    : strings('onboarding.sign_in_with_apple')}
                </Text>
              </View>
            }
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            style={styles.socialBtn}
          />
        </View>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Muted}>
            {strings('onboarding.or')}
          </Text>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariants.Secondary}
            onPress={createWallet ? onPressCreateAction : onPressImportAction}
            testID={OnboardingSelectorIDs.IMPORT_SEED_BUTTON}
            label={
              createWallet
                ? strings('onboarding.continue_with_srp')
                : strings('onboarding.import_srp')
            }
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default OnboardingSheet;
