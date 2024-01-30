import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';

import BaseListItem from '../../../Base/ListItem';
import Text from '../../../Base/Text';

import CurrencyChevron from './CurrencyChevron';

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

const styles = StyleSheet.create({
  name: {
    fontSize: 16,
  },
  chevron: {
    flex: 0,
    marginLeft: 8,
  },
});

interface Props {
  label?: string;
  assetSymbol: string;
  icon?: ReactNode;
  assetName: string;
  highlighted?: boolean;
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
  <Box label={label} onPress={onPress} highlighted={highlighted} {...props}>
    <View>
      <ListItem.Content>
        {Boolean(icon) && <ListItem.Icon>{icon}</ListItem.Icon>}
        <ListItem.Body>
          <Text
            black
            bold
            style={styles.name}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {assetName}
          </Text>
        </ListItem.Body>
        <ListItem.Amounts style={styles.chevron}>
          <CurrencyChevron currency={assetSymbol} />
        </ListItem.Amounts>
      </ListItem.Content>
    </View>
  </Box>
);

export default AssetSelectorButton;
