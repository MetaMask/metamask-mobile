import React from 'react';
import { withNavigation } from '../../../../storybook/decorators';
import ethLogo from '../../../images/eth-logo-new.png';
import { View, StyleSheet } from 'react-native';
import KeyValueRowComponent, { TooltipSizes } from './index';
import Text, { TextColor, TextVariant } from '../../components/Texts/Text';
import Title from '../../../components/Base/Title';

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
            primary: { text: 'Sample Key Text' },
          }}
          value={{ primary: { text: 'Sample Value Text' } }}
        />
        <KeyValueRowComponent
          field={{
            primary: { text: 'Sample Key Text' },
            secondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          value={{
            primary: { text: 'Sample Value Text' },
            secondary: {
              text: 'Secondary Value Text',
              variant: TextVariant.BodyXSMedium,
              color: TextColor.Success,
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            primary: {
              text: 'Sample Key Text',
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Quis sunt ullamco incididunt id ad. Magna deserunt quis aliqua non laborum nostrud exercitation adipisicing commodo.',
              },
            },
            secondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          value={{
            primary: { text: 'Sample Value Text' },
            secondary: {
              text: 'Secondary Value Text',
              variant: TextVariant.BodyXSMedium,
              color: TextColor.Warning,
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Quis sunt ullamco incididunt id ad. Magna deserunt quis aliqua non laborum nostrud exercitation adipisicing commodo.',
                size: TooltipSizes.Sm,
              },
            },
          }}
        />
        <KeyValueRowComponent
          field={{
            primary: {
              text: 'Sample Key Text',
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Quis sunt ullamco incididunt id ad. Magna deserunt quis aliqua non laborum nostrud exercitation adipisicing commodo.',
              },
            },
            secondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          value={{
            primary: { text: 'Sample Value Text' },
            secondary: {
              text: 'Secondary Value Text',
              icon: {
                name: 'Ethereum Logo',
                isIpfsGatewayCheckBypassed: true,
                src: ethLogo,
              },
            },
          }}
        />
      </View>
    </View>
  ),
};
