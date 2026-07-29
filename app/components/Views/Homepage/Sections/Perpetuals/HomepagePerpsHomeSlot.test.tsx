import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import HomepagePerpsHomeSlot from './HomepagePerpsHomeSlot';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('./PerpsSection', () => {
  const ReactLib = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef(
      (
        props: {
          emptyStateContent?: string;
          emptyStateTitleOverride?: string;
        },
        _ref: unknown,
      ) =>
        ReactLib.createElement(
          RN.View,
          null,
          ReactLib.createElement(RN.Text, null, 'PerpsSection'),
          ReactLib.createElement(
            RN.Text,
            null,
            `emptyStateContent:${props.emptyStateContent ?? 'tiles'}`,
          ),
          ReactLib.createElement(
            RN.Text,
            null,
            `emptyStateTitle:${props.emptyStateTitleOverride ?? 'default'}`,
          ),
        ),
    ),
  };
});

describe('HomepagePerpsHomeSlot', () => {
  it('asks PerpsSection to render Explore pills for the empty state', () => {
    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(screen.getByText('emptyStateContent:pills')).toBeOnTheScreen();
    expect(screen.getByText('emptyStateTitle:default')).toBeOnTheScreen();
  });
});
