import React, { useRef, useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, PerpsTooltipViewRouteParams>, string>>();
  const { styles } = useStyles(createStyles, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { contentKey, data } = route.params || {};

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

  // Content keys that render their own header (with icon)
  const hasCustomHeader =
    contentKey === 'market_hours' || contentKey === 'after_hours_trading';

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack
      goBack={navigation.goBack}
    >
      {!hasCustomHeader && (
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>{title}</Text>
        </BottomSheetHeader>
      )}
      <View style={styles.contentContainer}>{renderContent()}</View>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('perps.tooltips.got_it_button'),
          onPress: handleGotItPress,
          size: ButtonSize.Lg,
        }}
        style={styles.footerContainer}
      />
    </BottomSheet>
  );
};

export default PerpsTooltipView;
