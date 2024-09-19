import React from 'react';
import { withNavigation } from '../../../../storybook/decorators';
import { View, StyleSheet } from 'react-native';
import KeyValueRowComponent, {
  KeyValueRowFieldIconSides,
  TooltipSizes,
} from './index';
import Text, { TextColor, TextVariant } from '../../components/Texts/Text';
import Title from '../../../components/Base/Title';
import { IconColor, IconName, IconSize } from '../../components/Icons/Icon';

const KeyValueRowMeta = {
  title: 'Components Temp / KeyValueRow',
  component: KeyValueRowComponent,
  decorators: [withNavigation],
};

export default KeyValueRowMeta;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  listItem: {
    marginVertical: 16,
    gap: 16,
  },
});

export const KeyValueRow = {
  render: () => (
    <View style={styles.container}>
      <Title>KeyValueRow Component</Title>
      <Text variant={TextVariant.BodySM}>
        Prebuilt component displayed below but KeyValueRow stubs are available
        to create new KeyValueRow variants.
      </Text>
      <View style={styles.listItem}>
        <KeyValueRowComponent
          field={{
            primary: {
              text: 'Sample Key Text',
            },
          }}
          value={{ primary: { text: 'Sample Key Text' } }}
        />
        <KeyValueRowComponent
          field={{
            primary: {
              text: 'Sample Key Text',
            },
            secondary: {
              text: 'Sample Value Text',
              variant: TextVariant.BodySM,
              color: TextColor.Alternative,
            },
          }}
          value={{
            primary: {
              text: 'Sample Value Text',
            },
            secondary: {
              text: 'Sample Value Text',
              color: TextColor.Success,
              variant: TextVariant.BodySM,
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            primary: {
              text: 'Sample Key Text',
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
              },
            },
            secondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          value={{
            primary: {
              text: 'Sample Value Text',
            },
            secondary: {
              text: 'Secondary Value Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Warning,
              icon: {
                name: IconName.Warning,
                color: IconColor.Warning,
                size: IconSize.Sm,
                side: KeyValueRowFieldIconSides.RIGHT,
              },
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            primary: {
              text: 'Sample Key Text',
              icon: {
                name: IconName.Wifi,
                color: IconColor.Primary,
                size: IconSize.Sm,
                side: KeyValueRowFieldIconSides.BOTH,
              },
            },
            secondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          value={{
            primary: {
              text: 'Sample Value Text',
            },
            secondary: {
              text: 'Secondary Value Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
                size: TooltipSizes.Sm,
              },
            },
          }}
        />
      </View>
    </View>
  ),
};
