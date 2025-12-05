import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Box from './Box';
import SkeletonText from './SkeletonText';
import DownChevronText from './DownChevronText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  AvatarToken,
  AvatarTokenSize,
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
    <View>
      {loading ? (
        <ListItem>
          <ListItemColumn>
            <AvatarToken
              size={AvatarTokenSize.Xl}
              twClassName="bg-background-hover"
            />
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            <SkeletonText small />
          </ListItemColumn>
          <ListItemColumn>
            <SkeletonText small />
          </ListItemColumn>
        </ListItem>
      ) : (
        <ListItem>
          {Boolean(icon) && <ListItemColumn>{icon}</ListItemColumn>}

          <ListItemColumn widthType={WidthType.Fill}>
            <Text
              variant={TextVariant.BodyLGMedium}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {assetName}
            </Text>
          </ListItemColumn>

          <ListItemColumn>
            <DownChevronText text={assetSymbol} />
          </ListItemColumn>
        </ListItem>
      )}
    </View>
  </Box>
);

export default AssetSelectorButton;
