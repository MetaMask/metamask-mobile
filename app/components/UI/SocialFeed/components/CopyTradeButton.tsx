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
import { useIsCopyTradeAllowed } from '../hooks/useIsCopyTradeAllowed';

export interface CopyTradeButtonProps {
  testID?: string;
  onPress?: () => void;
}

const CopyTradeButton: React.FC<CopyTradeButtonProps> = ({
  testID,
  onPress,
}) => {
  const copyTradeAllowed = useIsCopyTradeAllowed();
  const handlePress = useCallback(() => {
    fireImpact(ImpactMoment.SecondaryCTA);
    onPress?.();
  }, [onPress]);

  if (!copyTradeAllowed) {
    return null;
  }

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
