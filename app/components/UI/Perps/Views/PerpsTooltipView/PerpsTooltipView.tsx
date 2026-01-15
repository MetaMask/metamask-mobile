import React, { useRef, useCallback } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import createStyles from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.styles';
import { tooltipContentRegistry } from '../../components/PerpsBottomSheetTooltip/content/contentRegistry';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';
import { View } from 'react-native';

interface PerpsTooltipViewRouteParams {
  contentKey: PerpsTooltipContentKey;
  data?: Record<string, unknown>;
}

const PerpsTooltipView: React.FC = () => {
  const route =
    useRoute<RouteProp<Record<string, PerpsTooltipViewRouteParams>, string>>();
  const { styles } = useStyles(createStyles, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { contentKey, data } = route.params || {};

  const handleClose = useCallback(() => {
    // BottomSheet will handle navigation.goBack() when shouldNavigateBack is true
  }, []);

  const handleGotItPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  if (!contentKey) {
    return null;
  }

  const title = strings(`perps.tooltips.${contentKey}.title`);

  const renderContent = () => {
    const CustomRenderer = tooltipContentRegistry[contentKey];

    if (CustomRenderer) {
      return (
        <CustomRenderer
          testID={PerpsBottomSheetTooltipSelectorsIDs.CONTENT}
          data={data}
        />
      );
    }

    return (
      <Text variant={TextVariant.BodyMD}>
        {strings(`perps.tooltips.${contentKey}.content`)}
      </Text>
    );
  };

  const footerButtons = [
    {
      label: strings('perps.tooltips.got_it_button'),
      onPress: handleGotItPress,
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
    },
  ];

  // Content keys that render their own header (with icon)
  const hasCustomHeader =
    contentKey === 'market_hours' || contentKey === 'after_hours_trading';

  return (
    <BottomSheet ref={bottomSheetRef} shouldNavigateBack onClose={handleClose}>
      {!hasCustomHeader && (
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>{title}</Text>
        </BottomSheetHeader>
      )}
      <View style={styles.contentContainer}>{renderContent()}</View>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={footerButtons}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default PerpsTooltipView;
