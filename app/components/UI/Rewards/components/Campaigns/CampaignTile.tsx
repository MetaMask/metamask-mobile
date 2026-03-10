import React, { useMemo, useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import { getCampaignStatusInfo } from './CampaignTile.utils';

interface CampaignTileProps {
  campaign: CampaignDto;
}

/**
 * CampaignTile displays campaign information with status.
 * Tapping navigates to the campaign details screen.
 */
const CampaignTile: React.FC<CampaignTileProps> = ({ campaign }) => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const { statusLabel, statusDescription, statusDescriptionIcon } = useMemo(
    () => getCampaignStatusInfo(campaign),
    [campaign],
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGN_DETAILS, { campaign });
  }, [navigation, campaign]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) =>
        tw.style(
          'rounded-xl overflow-hidden h-50 bg-muted',
          pressed && 'opacity-70',
        )
      }
      testID={`campaign-tile-${campaign.id}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        justifyContent={BoxJustifyContent.Between}
        twClassName="p-4 flex-1"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Icon
            name={statusDescriptionIcon}
            size={IconSize.Sm}
            twClassName="text-default"
          />
          <Text variant={TextVariant.BodySm} twClassName="text-default">
            {statusDescription}
          </Text>
        </Box>

        <Box flexDirection={BoxFlexDirection.Column}>
          <Text variant={TextVariant.BodySm} twClassName="text-success-default">
            {statusLabel}
          </Text>

          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-default font-bold"
          >
            {campaign.name}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default CampaignTile;
