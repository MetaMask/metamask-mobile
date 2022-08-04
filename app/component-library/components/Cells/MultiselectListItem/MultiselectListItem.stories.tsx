/* eslint-disable no-console, react-native/no-inline-styles */
import React, { useState } from 'react';
import { storiesOf } from '@storybook/react-native';
import MultiselectListItem from './MultiselectListItem';
import { boolean } from '@storybook/addon-knobs';
import { View } from 'react-native';
import { mockTheme } from '../../../util/theme';
import BaseText, { BaseTextVariant } from '../BaseText';

const MultiselectListItemExample = () => {
  const [data, setData] = useState([true, true, false]);

  const renderItem = (isSelected: boolean, index: number) => (
    <MultiselectListItem
      onPress={() => {
        const newData = [...data];
        newData[index] = !isSelected;
        setData(newData);
      }}
      key={`item-${index}`}
      isSelected={isSelected}
    >
      <View
        style={{
          height: 50,
          flex: 1,
          backgroundColor: mockTheme.colors.background.alternative,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BaseText variant={BaseTextVariant.sBodySM}>
          {'Wrapped Content'}
        </BaseText>
      </View>
    </MultiselectListItem>
  );

  return <React.Fragment>{data.map(renderItem)}</React.Fragment>;
};

storiesOf('Component Library / MultiselectListItem', module)
  .addDecorator((getStory) => getStory())
  .add('Default', () => {
    const groupId = 'Props';
    const selectedSelector = boolean('isSelected', false, groupId);

    return (
      <MultiselectListItem isSelected={selectedSelector}>
        <View
          style={{
            height: 50,
            flex: 1,
            backgroundColor: mockTheme.colors.background.alternative,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BaseText variant={BaseTextVariant.sBodySM}>
            {'Wrapped Content'}
          </BaseText>
        </View>
      </MultiselectListItem>
    );
  })
  .add('Multilist', () => <MultiselectListItemExample />);
