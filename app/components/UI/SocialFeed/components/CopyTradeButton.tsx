import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { fireImpact, ImpactMoment } from '../../../../util/haptics';

export interface CopyTradeButtonProps {
  testID?: string;
  onPress?: () => void;
}

const CopyTradeButton: React.FC<CopyTradeButtonProps> = ({
  testID,
  onPress,
}) => {
  const handlePress = useCallback(() => {
    fireImpact(ImpactMoment.SecondaryCTA);
    onPress?.();
  }, [onPress]);

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      isFullWidth
      startIconName={IconName.SwapHorizontal}
      textProps={{
        variant: TextVariant.BodySm,
        fontWeight: FontWeight.Medium,
      }}
      onPress={handlePress}
      testID={testID}
    >
      {strings('social_leaderboard.feed.position_card.copy_trade')}
    </Button>
  );
};

export default CopyTradeButton;
