import React from 'react';
import { View } from 'react-native';
import XStockRowItem from '../XStockRowItem/XStockRowItem';
import type { XStockWithData } from '../../../../../components/hooks/useXStocksData';

export interface XStocksListProps {
  xstocks: XStockWithData[];
  onXStockPress: (xstock: XStockWithData) => void;
}

const XStocksList: React.FC<XStocksListProps> = ({
  xstocks,
  onXStockPress,
}) => (
  <View>
    {xstocks.map((xstock) => (
      <XStockRowItem
        key={xstock.solanaAddress}
        xstock={xstock}
        onPress={onXStockPress}
      />
    ))}
  </View>
);

export default XStocksList;
