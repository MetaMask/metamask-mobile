import React from 'react';
import { render } from '@testing-library/react-native';
import ethLogo from '../../../images/eth-logo-new.png';
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
            field={{
              primary: { text: 'Sample Key Text' },
            }}
            value={{ primary: { text: 'Sample Value Text' } }}
          />,
        );

        expect(toJSON()).toMatchSnapshot();
      });

      it('should render both primary and secondary text', () => {
        const { toJSON } = render(
          <KeyValueRow
            field={{
              primary: { text: 'Primary Key Text' },
              secondary: {
                text: 'Secondary Key Text',
                variant: TextVariant.BodySMMedium,
                color: TextColor.Alternative,
              },
            }}
            value={{
              primary: { text: 'Primary Value Text' },
              secondary: {
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
            field={{
              primary: {
                text: 'Primary Key Text',
                tooltip: {
                  title: 'Sample Tooltip 1',
                  text: 'Tooltip 1 text',
                },
              },
              secondary: {
                text: 'Secondary Key Text',
                variant: TextVariant.BodySMMedium,
                color: TextColor.Alternative,
                tooltip: {
                  title: 'Sample Tooltip 2',
                  text: 'Tooltip 2 text',
                },
              },
            }}
            value={{
              primary: {
                text: 'Primary Value Text',
                tooltip: {
                  title: 'Sample Tooltip 3',
                  text: 'Tooltip 3 text',
                },
              },
              secondary: {
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
            field={{
              primary: {
                text: 'Primary Key Text',
                icon: {
                  name: 'Ethereum Logo',
                  isIpfsGatewayCheckBypassed: true,
                  src: ethLogo,
                },
              },
              secondary: {
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
            value={{
              primary: {
                text: 'Primary Value Text',
                icon: {
                  name: 'Ethereum Logo',
                  isIpfsGatewayCheckBypassed: true,
                  src: ethLogo,
                },
              },
              secondary: {
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
