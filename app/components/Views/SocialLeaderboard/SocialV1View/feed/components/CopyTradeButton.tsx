import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';

export interface CopyTradeButtonProps {
  testID?: string;
  onPress?: () => void;
}

const CopyTradeButton: React.FC<CopyTradeButtonProps> = ({
  testID,
  onPress,
}) => (
  <Button
    variant={ButtonVariant.Secondary}
    size={ButtonSize.Lg}
    isFullWidth
    startIconName={IconName.SwapHorizontal}
    onPress={onPress ?? (() => undefined)}
    testID={testID}
  >
    {strings('social_leaderboard.feed.position_card.copy_trade')}
  </Button>
);

export default CopyTradeButton;
