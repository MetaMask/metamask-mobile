// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies
import ethLogo from '../../../images/eth-logo-new.png';

// Internal dependencies.
import KeyValueRow from './KeyValueRow';
import { TextVariant, TextColor } from '../../components/Texts/Text';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('KeyValueRow', () => {
  describe('Prebuilt Component', () => {
    describe('KeyValueRow', () => {
      it('should render when there is only primary text', () => {
        const { toJSON } = render(
          <KeyValueRow
            keyText={{
              textPrimary: { text: 'Sample Key Text' },
            }}
            valueText={{ textPrimary: { text: 'Sample Value Text' } }}
          />,
        );

        expect(toJSON()).toMatchSnapshot();
      });

      it('should render both primary and secondary text', () => {
        const { toJSON } = render(
          <KeyValueRow
            keyText={{
              textPrimary: { text: 'Primary Key Text' },
              textSecondary: {
                text: 'Secondary Key Text',
                variant: TextVariant.BodySMMedium,
                color: TextColor.Alternative,
              },
            }}
            valueText={{
              textPrimary: { text: 'Primary Value Text' },
              textSecondary: {
                text: 'Secondary Value Text',
                variant: TextVariant.BodyXSMedium,
                color: TextColor.Success,
              },
            }}
          />,
        );

        expect(toJSON()).toMatchSnapshot();
      });

      it('should render both primary and secondary text with tooltips', () => {
        const { toJSON } = render(
          <KeyValueRow
            keyText={{
              textPrimary: {
                text: 'Primary Key Text',
                tooltip: {
                  title: 'Sample Tooltip 1',
                  text: 'Tooltip 1 text',
                },
              },
              textSecondary: {
                text: 'Secondary Key Text',
                variant: TextVariant.BodySMMedium,
                color: TextColor.Alternative,
                tooltip: {
                  title: 'Sample Tooltip 2',
                  text: 'Tooltip 2 text',
                },
              },
            }}
            valueText={{
              textPrimary: {
                text: 'Primary Value Text',
                tooltip: {
                  title: 'Sample Tooltip 3',
                  text: 'Tooltip 3 text',
                },
              },
              textSecondary: {
                text: 'Secondary Value Text',
                variant: TextVariant.BodyXSMedium,
                color: TextColor.Success,
                tooltip: {
                  title: 'Sample Tooltip 4',
                  text: 'Tooltip 4 text',
                },
              },
            }}
          />,
        );

        expect(toJSON()).toMatchSnapshot();
      });

      it('should render both primary and secondary text with icons', () => {
        const { toJSON } = render(
          <KeyValueRow
            keyText={{
              textPrimary: {
                text: 'Primary Key Text',
                icon: {
                  name: 'Ethereum Logo',
                  isIpfsGatewayCheckBypassed: true,
                  src: ethLogo,
                },
              },
              textSecondary: {
                text: 'Secondary Key Text',
                variant: TextVariant.BodySMMedium,
                color: TextColor.Alternative,
                icon: {
                  name: 'Ethereum Logo',
                  isIpfsGatewayCheckBypassed: true,
                  src: ethLogo,
                },
              },
            }}
            valueText={{
              textPrimary: {
                text: 'Primary Value Text',
                icon: {
                  name: 'Ethereum Logo',
                  isIpfsGatewayCheckBypassed: true,
                  src: ethLogo,
                },
              },
              textSecondary: {
                text: 'Secondary Value Text',
                variant: TextVariant.BodyXSMedium,
                color: TextColor.Success,
                icon: {
                  name: 'Ethereum Logo',
                  isIpfsGatewayCheckBypassed: true,
                  src: ethLogo,
                },
              },
            }}
          />,
        );

        expect(toJSON()).toMatchSnapshot();
      });
    });
  });
});
