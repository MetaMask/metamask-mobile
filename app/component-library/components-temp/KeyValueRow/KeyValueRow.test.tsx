import React from 'react';
import { render } from '@testing-library/react-native';
import KeyValueRow from './KeyValueRow';
import { IconName } from '../../components/Icons/Icon';

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
      it('renders field and value labels', () => {
        const { getByText } = render(
          <KeyValueRow
            field={{ label: { text: 'Sample Key Text' } }}
            value={{ label: { text: 'Sample Value Text' } }}
          />,
        );

        expect(getByText('Sample Key Text')).toBeOnTheScreen();
        expect(getByText('Sample Value Text')).toBeOnTheScreen();
      });

      it('renders field and value labels with tooltips', () => {
        const { getByText } = render(
          <KeyValueRow
            field={{
              label: { text: 'Key Text' },
              tooltip: {
                title: 'Sample Tooltip 1',
                content: 'Tooltip 1 text',
              },
            }}
            value={{
              label: { text: 'Value Text' },
              tooltip: {
                title: 'Sample Tooltip 2',
                content: 'Tooltip 2 text',
              },
            }}
          />,
        );

        expect(getByText('Key Text')).toBeOnTheScreen();
        expect(getByText('Value Text')).toBeOnTheScreen();
      });

      it('renders field and value labels with icons', () => {
        const { getByText } = render(
          <KeyValueRow
            field={{
              label: { text: 'Key Text' },
              icon: {
                name: IconName.Activity,
              },
            }}
            value={{
              label: { text: 'Value Text' },
              icon: {
                name: IconName.Add,
              },
            }}
          />,
        );

        expect(getByText('Key Text')).toBeOnTheScreen();
        expect(getByText('Value Text')).toBeOnTheScreen();
      });

      it('renders field and value labels with icons and tooltips', () => {
        const { getByText } = render(
          <KeyValueRow
            field={{
              label: { text: 'Key Text' },
              icon: {
                name: IconName.Activity,
              },
              tooltip: {
                title: 'Sample Tooltip 2',
                content: 'Tooltip 2 text',
              },
            }}
            value={{
              label: { text: 'Value Text' },
              icon: {
                name: IconName.Add,
              },
              tooltip: {
                title: 'Sample Tooltip 2',
                content: 'Tooltip 2 text',
              },
            }}
          />,
        );

        expect(getByText('Key Text')).toBeOnTheScreen();
        expect(getByText('Value Text')).toBeOnTheScreen();
      });
    });
  });
});
