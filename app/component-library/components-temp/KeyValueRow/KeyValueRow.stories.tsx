import React from 'react';
import { View, StyleSheet } from 'react-native';
import KeyValueRowComponent, {
  KeyValueRowFieldIconSides,
  TooltipSizes,
} from './index';
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
          value={{ label: { text: 'Sample Value Text' } }}
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
              text: 'Sample Value Text',
              variant: TextVariant.BodySMBold,
              color: TextColor.Success,
            },
            tooltip: {
              title: 'Sample Title',
              content:
                'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
              size: TooltipSizes.Sm,
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            label: {
              text: 'Sample Key Text',
            },
            tooltip: {
              title: 'Sample Tooltip',
              content:
                'Pariatur nisi pariatur ex veniam ad. Non tempor nostrud sint velit cupidatat aliquip elit ut pariatur reprehenderit enim enim commodo eu.',
            },
          }}
          value={{
            label: {
              text: 'Sample Value Text',
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
              text: 'Sample Value Text',
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
              title: 'Sample Tooltip',
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
