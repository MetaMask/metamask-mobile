/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, View } from 'react-native';
import { MARGIN } from './Config';
import Title from './Title';
import SortableList from './SortableList';

const tiles = [
  {
    id: 'spent',
  },
  {
    id: 'cashback',
  },
  {
    id: 'recent',
  },
  {
    id: 'cards',
  },
];

const WidgetList = () => (
  <View
    style={{
      marginTop: 12,
    }}
  >
    <Text
      style={{
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 12,
      }}
    >
      Widgets
    </Text>
    <SortableList
      editing
      onDragEnd={(positions) => console.log(JSON.stringify(positions, null, 2))}
    >
      {[...tiles].map((tile, index) => (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        <Title
          onLongPress={() => true}
          key={tile.id + '-' + index}
          id={tile.id}
        />
      ))}
    </SortableList>
  </View>
);

export default WidgetList;
