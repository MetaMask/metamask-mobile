import React, { useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { PerpsBottomSheetTooltipProps } from './PerpsBottomSheetTooltip.types';
import createStyles from './PerpsBottomSheetTooltip.styles';
import { tooltipContentRegistry } from './content/contentRegistry';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsBottomSheetTooltip = ({
  isVisible,
  onClose,
  contentKey,
  testID = PerpsBottomSheetTooltipSelectorsIDs.TOOLTIP,
}: PerpsBottomSheetTooltipProps) => {
  const { styles } = useStyles(createStyles, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Get localized content
  const title = strings(`perps.tooltips.${contentKey}.title`);

  // Render content using registry system - supports both custom components and default strings
  const renderContent = () => {
    const CustomRenderer = tooltipContentRegistry[contentKey];

    if (CustomRenderer) {
      // Use custom component renderer
      return (
        <CustomRenderer testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT} />
      );
    }

    // Fall back to default string-based content
    return (
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT}
      >
        {strings(`perps.tooltips.${contentKey}.content`)}
      </Text>
    );
  };

  const buttonLabel = strings('perps.tooltips.got_it_button');

  const footerButtons: ButtonProps[] = [
    {
      label: buttonLabel,
      onPress: () => {
        bottomSheetRef.current?.onCloseBottomSheet();
      },
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      testID: PerpsBottomSheetTooltipSelectorsIDs.GOT_IT_BUTTON,
    },
  ];

  // Only render when visible and title is defined
  if (!isVisible || !title) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID}
    >
      <BottomSheetHeader>
        <Text
          variant={TextVariant.HeadingMD}
          testID={PerpsBottomSheetTooltipSelectorsIDs.TITLE}
        >
          {title}
        </Text>
      </BottomSheetHeader>
      <View style={styles.contentContainer}>{renderContent()}</View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default PerpsBottomSheetTooltip;
