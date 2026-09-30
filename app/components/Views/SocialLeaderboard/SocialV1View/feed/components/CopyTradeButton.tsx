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
    size={ButtonSize.Md}
    isFullWidth
    // Squared off to the card's own corner radius rather than the pill shape the
    // design system defaults to, so the CTA reads as part of the card.
    twClassName="rounded-2xl"
    startIconName={IconName.SwapHorizontal}
    onPress={onPress ?? (() => undefined)}
    testID={testID}
  >
    {strings('social_leaderboard.feed.position_card.copy_trade')}
  </Button>
);

export default CopyTradeButton;
