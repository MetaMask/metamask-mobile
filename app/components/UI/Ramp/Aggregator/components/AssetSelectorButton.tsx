import React, { ReactNode } from 'react';
import Box from './Box';
import SkeletonText from './SkeletonText';
import DownChevronText from './DownChevronText';
import {
  AvatarToken,
  AvatarTokenSize,
  ListItem,
  ListItemVariant,
} from '@metamask/design-system-react-native';

export interface Props {
  label?: string;
  assetSymbol: string;
  icon?: ReactNode;
  assetName: string;
  highlighted?: boolean;
  loading?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: () => any;
}

const AssetSelectorButton: React.FC<Props> = ({
  label,
  assetSymbol,
  assetName,
  icon,
  onPress,
  highlighted,
  loading = false,
  ...props
}: Props) => (
  <Box
    label={label}
    onPress={loading ? undefined : onPress}
    highlighted={highlighted}
    compact
    {...props}
  >
    {loading ? (
      <ListItem
        variant={ListItemVariant.OneLine}
        accessoryGap={4}
        avatar={
          <AvatarToken
            size={AvatarTokenSize.Xl}
            twClassName="bg-background-hover"
          />
        }
        title={<SkeletonText small />}
        endAccessory={<SkeletonText small />}
      />
    ) : (
      <ListItem
        variant={ListItemVariant.OneLine}
        accessoryGap={4}
        avatar={icon || undefined}
        title={assetName}
        titleProps={{ numberOfLines: 1, adjustsFontSizeToFit: true }}
        endAccessory={<DownChevronText text={assetSymbol} />}
      />
    )}
  </Box>
);

export default AssetSelectorButton;
