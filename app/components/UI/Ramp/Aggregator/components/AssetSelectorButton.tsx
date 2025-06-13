import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Box from './Box';
import DownChevronText from './DownChevronText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

interface Props {
  label?: string;
  assetSymbol: string;
  icon?: ReactNode;
  assetName: string;
  highlighted?: boolean;
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
  ...props
}: Props) => (
  <Box
    label={label}
    onPress={onPress}
    highlighted={highlighted}
    compact
    {...props}
  >
    <View>
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
    </View>
  </Box>
);

export default AssetSelectorButton;
