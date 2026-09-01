import React from 'react';
import { View, StyleSheet } from 'react-native';
import KeyValueRowComponent, { KeyValueRowFieldIconSides } from './index';
import Text, { TextColor, TextVariant } from '../../components/Texts/Text';
import Title from '../../../components/Base/Title';
import { IconColor, IconName, IconSize } from '../../components/Icons/Icon';
import Button, { ButtonVariants } from '../../components/Buttons/Button';

const KeyValueRowMeta = {
  title: 'Components Temp / KeyValueRow',
  component: KeyValueRowComponent,
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
            label: {
              text: 'Sample Key Text',
            },
          }}
          value={{ label: { text: 'Sample value text' } }}
        />
        <KeyValueRowComponent
          field={{
            label: {
              text: 'Sample Key Text',
              variant: TextVariant.BodySM,
              color: TextColor.Alternative,
            },
          }}
          value={{
            label: {
              text: 'Sample value text',
              variant: TextVariant.BodySMBold,
              color: TextColor.Success,
            },
            tooltip: {
              title: 'Sample title',
              content:
                'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            label: {
              text: 'Sample Key Text',
            },
            tooltip: {
              title: 'Sample tooltip',
              content:
                'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
            },
          }}
          value={{
            label: {
              text: 'Sample value text',
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            label: {
              text: 'Sample Key Text',
            },
            icon: {
              name: IconName.Wifi,
              color: IconColor.Primary,
              size: IconSize.Sm,
              side: KeyValueRowFieldIconSides.BOTH,
            },
          }}
          value={{
            label: {
              text: 'Sample value text',
            },
            icon: {
              name: IconName.Wifi,
              color: IconColor.Primary,
              size: IconSize.Sm,
              side: KeyValueRowFieldIconSides.BOTH,
            },
          }}
        />
        {/* Using Custom ReactNode */}
        <KeyValueRowComponent
          field={{
            label: { text: 'Sample Key' },
            icon: { name: IconName.UserCircleAdd, color: IconColor.Primary },
            tooltip: {
              title: 'Sample tooltip',
              content:
                'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
            },
          }}
          value={{
            label: (
              <Button
                variant={ButtonVariants.Link}
                label="Sample button"
                // eslint-disable-next-line no-alert
                onPress={() => alert('test')}
              />
            ),
          }}
        />
      </View>
    </View>
  ),
};
