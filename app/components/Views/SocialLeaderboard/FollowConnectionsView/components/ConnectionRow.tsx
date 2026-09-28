import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import {
  getConnectionFollowButtonTestId,
  getConnectionRowTestId,
} from '../FollowConnectionsView.testIds';

const AVATAR_SIZE = 40;

export interface ConnectionRowProps {
  id: string;
  username: string;
  subtitle: string;
  address: string;
  avatarUri?: string;
  isFollowing: boolean;
  onFollowPress?: () => void;
  onRowPress?: () => void;
}

const ConnectionRow: React.FC<ConnectionRowProps> = ({
  id,
  username,
  subtitle,
  address,
  avatarUri,
  isFollowing,
  onFollowPress,
  onRowPress,
}) => {
  const tw = useTailwind();
  const handleRowPress = useCallback(() => {
    onRowPress?.();
  }, [onRowPress]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3"
    >
      <Pressable
        onPress={onRowPress ? handleRowPress : undefined}
        disabled={!onRowPress}
        style={tw.style('flex-1 min-w-0 mr-3')}
        testID={getConnectionRowTestId(id)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <TraderAvatar
            imageUrl={avatarUri}
            address={address}
            size={AVATAR_SIZE}
            recyclingKey={id}
          />
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {username}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </Box>
        </Box>
      </Pressable>
      <Button
        variant={isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary}
        size={ButtonSize.Md}
        onPress={onFollowPress ?? (() => undefined)}
        testID={getConnectionFollowButtonTestId(id)}
      >
        {isFollowing
          ? strings('social_leaderboard.following')
          : strings('social_leaderboard.follow')}
      </Button>
    </Box>
  );
};

export default ConnectionRow;
