import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { PredictPosition as PredictPositionType } from '../../types';
import { strings } from '../../../../../../locales/i18n';
interface MarketsWonCardProps {
  positions: PredictPositionType[];
  totalClaimableAmount: number;
  onClaimPress: () => void;
}

const MarketsWonCard: React.FC<MarketsWonCardProps> = ({
  positions,
  totalClaimableAmount,
  onClaimPress,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="bg-muted rounded-xl p-4 mt-2 mb-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Box>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('predict.markets_won')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Box twClassName="flex-row items-center">
                {positions.slice(0, 3).map((position, index) => (
                  <Image
                    key={`${position.conditionId}-${position.outcomeIndex}-${index}`}
                    source={{ uri: position.icon }}
                    style={tw.style(
                      'w-6 h-6 rounded-full border-2 border-background-alternative',
                      index === 0 ? 'ml-0' : '-ml-2',
                    )}
                  />
                ))}
              </Box>
              {positions.length > 3 && (
                <Text variant={TextVariant.BodySm} twClassName="ml-2">
                  +{positions.length - 3}
                </Text>
              )}
            </Box>
          </Box>
        </Box>

        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={onClaimPress}
          label={`${strings(
            'predict.claim_button',
          )} $${totalClaimableAmount.toFixed(2)}`}
        />
      </Box>
    </Box>
  );
};

export default MarketsWonCard;
