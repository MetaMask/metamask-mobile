import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatVolume } from '../../utils/format';
import { PredictActionButtons } from '../PredictActionButtons';
import { PredictGameDetailsFooterProps } from './PredictGameDetailsFooter.types';

const PredictGameDetailsFooter: React.FC<PredictGameDetailsFooterProps> = ({
  market,
  outcome,
  onBetPress,
  onClaimPress,
  onInfoPress,
  claimableAmount = 0,
  isLoading = false,
  testID = 'predict-game-details-footer',
}) => {
  const insets = useSafeAreaInsets();
  const formattedVolume = useMemo(
    () => formatVolume(market.volume ?? 0),
    [market.volume],
  );

  const isMarketClosed =
    market.status !== 'open' || market.game?.status === 'ended';
  const hasClaimableWinnings = claimableAmount > 0;
  const showClaimButton = hasClaimableWinnings && onClaimPress;

  if (isMarketClosed && !hasClaimableWinnings) {
    return null;
  }

  const content = (
    <Box
      twClassName={'px-4 pt-3 border-t border-muted'}
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={testID}
    >
      {!showClaimButton && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-2"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              testID={`${testID}-label`}
            >
              {strings('predict.game_details_footer.pick_a_winner')}
            </Text>
            <ButtonIcon
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconAlternative }}
              iconName={IconName.Info}
              onPress={onInfoPress}
              testID={`${testID}-info-button`}
            />
          </Box>

          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${testID}-volume`}
          >
            {strings('predict.game_details_footer.volume_display', {
              volume: formattedVolume,
            })}
          </Text>
        </Box>
      )}

      <PredictActionButtons
        market={market}
        outcome={outcome}
        onBetPress={onBetPress}
        onClaimPress={onClaimPress}
        claimableAmount={claimableAmount}
        isLoading={isLoading}
        testID={`${testID}-action-buttons`}
      />
    </Box>
  );

  return content;
};

export default PredictGameDetailsFooter;
