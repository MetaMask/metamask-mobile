import React, { useRef } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import RewardsTag, { RewardsTagBackgroundVariant } from '../RewardsTag';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './RewardsTooltipBottomSheet.styles';

export const REWARDS_TOOLTIP_BOTTOM_SHEET_SELECTOR =
  'rewards-tooltip-bottom-sheet';

export interface RewardsTooltipBottomSheetProps {
  /**
   * Whether the user is opted into rewards
   */
  isOptedIn: boolean;
  /**
   * Controls visibility of the bottom sheet
   */
  isVisible: boolean;
  /**
   * Callback when bottom sheet closes
   */
  onClose: () => void;
  /**
   * Optional test ID
   */
  testID?: string;
}

/**
 * Reusable rewards tooltip bottom sheet with 2 variants:
 * - Variant 1 (opted in): Shows that points will be automatically added
 * - Variant 2 (not opted in): Shows opt-in message
 *
 * Used for mUSD conversion and other features.
 */
const RewardsTooltipBottomSheet: React.FC<RewardsTooltipBottomSheetProps> = ({
  isOptedIn,
  isVisible,
  onClose,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const footerButtons = [
    {
      label: strings('earn.rewards.tooltip_close'),
      onPress: handleClose,
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
    },
  ];

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID || REWARDS_TOOLTIP_BOTTOM_SHEET_SELECTOR}
      style={styles.bottomSheet}
    >
      <View style={styles.headerContainer}>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSizes.Lg}
          onPress={handleClose}
          style={styles.closeButton}
          testID="rewards-tooltip-close-icon"
        />
        <Text variant={TextVariant.HeadingLG} style={styles.title}>
          {strings('earn.rewards.tooltip_title')}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.rewardsTagContainer}>
          <RewardsTag
            points={5}
            backgroundVariant={RewardsTagBackgroundVariant.Muted}
            suffix={strings('earn.rewards.tooltip_points_suffix')}
          />
        </View>

        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {strings('earn.rewards.tooltip_description')}
        </Text>

        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {isOptedIn
            ? strings('earn.rewards.tooltip_opted_in_footer')
            : strings('earn.rewards.tooltip_not_opted_in_footer')}
        </Text>
      </View>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default RewardsTooltipBottomSheet;
