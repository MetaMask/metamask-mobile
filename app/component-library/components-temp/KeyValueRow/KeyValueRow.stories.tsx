// Third party dependencies.
import React from 'react';

// External dependencies
import { withNavigation } from '../../../../storybook/decorators';
import ethLogo from '../../../images/eth-logo-new.png';

// Internal dependencies
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
        to create new types fo KeyValueRow types.
      </Text>
      <View style={styles.listItem}>
        <KeyValueRowComponent
          keyText={{
            textPrimary: { text: 'Sample Key Text' },
          }}
          valueText={{ textPrimary: { text: 'Sample Value Text' } }}
        />
        <KeyValueRowComponent
          keyText={{
            textPrimary: { text: 'Sample Key Text' },
            textSecondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          valueText={{
            textPrimary: { text: 'Sample Value Text' },
            textSecondary: {
              text: 'Secondary Value Text',
              variant: TextVariant.BodyXSMedium,
              color: TextColor.Success,
            },
          }}
        />
        <KeyValueRowComponent
          keyText={{
            textPrimary: {
              text: 'Sample Key Text',
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Quis sunt ullamco incididunt id ad. Magna deserunt quis aliqua non laborum nostrud exercitation adipisicing commodo.',
              },
            },
            textSecondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          valueText={{
            textPrimary: { text: 'Sample Value Text' },
            textSecondary: {
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
          keyText={{
            textPrimary: {
              text: 'Sample Key Text',
              tooltip: {
                title: 'Sample Tooltip',
                text: 'Quis sunt ullamco incididunt id ad. Magna deserunt quis aliqua non laborum nostrud exercitation adipisicing commodo.',
              },
            },
            textSecondary: {
              text: 'Secondary Key Text',
              variant: TextVariant.BodySMMedium,
              color: TextColor.Alternative,
            },
          }}
          valueText={{
            textPrimary: { text: 'Sample Value Text' },
            textSecondary: {
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
