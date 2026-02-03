import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { LEARN_MORE_CONFIG } from '../../constants/perpsConfig';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';
import PerpsEmptyStateIcon from '../../../../../images/perps-home-empty-state.png';

export interface PerpsEmptyBalanceProps {
  onAddFunds: () => void;
  onLearnMore: () => void;
}

const PerpsEmptyBalance: React.FC<PerpsEmptyBalanceProps> = ({
  onAddFunds,
  onLearnMore,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="p-6">
      <Box twClassName="items-center mb-6">
        <Image
          source={PerpsEmptyStateIcon}
          style={tw.style('w-24 h-24 mb-4')}
          resizeMode="contain"
        />
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={tw.style('mb-2 text-center')}
          testID={PerpsMarketBalanceActionsSelectorsIDs.EMPTY_STATE_TITLE}
        >
          {strings('perps.trade_perps')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={tw.style('text-center')}
          testID={PerpsMarketBalanceActionsSelectorsIDs.EMPTY_STATE_DESCRIPTION}
        >
          {strings('perps.trade_perps_description')}
        </Text>
      </Box>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onAddFunds}
        isFullWidth
        testID={PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON}
        style={tw.style('mb-3')}
      >
        {strings('perps.add_funds')}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onLearnMore}
        isFullWidth
        testID={PerpsMarketBalanceActionsSelectorsIDs.LEARN_MORE_BUTTON}
      >
        {strings(LEARN_MORE_CONFIG.TitleKey)}
      </Button>
    </Box>
  );
};

export default PerpsEmptyBalance;
