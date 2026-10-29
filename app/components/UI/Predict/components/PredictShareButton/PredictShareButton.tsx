import React from 'react';
import { Pressable } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { IconName as DesignSystemIconName } from '@metamask/design-system-react-native';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import { useTheme } from '../../../../../util/theme';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';
import { strings } from '../../../../../../locales/i18n';
import usePredictShare from '../../hooks/usePredictShare';

interface PredictShareButtonProps {
  marketId?: string;
  marketSlug?: string;
  /** Seats the icon in a header glass capsule. */
  isCapsule?: boolean;
}

const PredictShareButton: React.FC<PredictShareButtonProps> = ({
  marketId,
  marketSlug,
  isCapsule = false,
}) => {
  const { colors } = useTheme();
  const { handleSharePress } = usePredictShare({ marketId, marketSlug });

  if (isCapsule) {
    return (
      <ButtonIconGlass
        isCapsule
        iconName={DesignSystemIconName.Share}
        onPress={handleSharePress}
        accessibilityLabel={strings('predict.buttons.share')}
        testID={PredictMarketDetailsSelectorsIDs.SHARE_BUTTON}
      />
    );
  }

  return (
    <Pressable
      onPress={handleSharePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={strings('predict.buttons.share')}
      testID={PredictMarketDetailsSelectorsIDs.SHARE_BUTTON}
    >
      <Icon
        name={IconName.Share}
        size={IconSize.Lg}
        color={colors.icon.default}
      />
    </Pressable>
  );
};

export default PredictShareButton;
