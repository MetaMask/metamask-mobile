import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
  HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
  HomepagePerpsPillsEmptyVariant,
} from '../../abTestConfig';
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

const mockUseABTest = jest.fn();
jest.mock('../../../../../hooks', () => ({
  useABTest: (...args: unknown[]) =>
    Reflect.apply(mockUseABTest, undefined, args),
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders PerpsSection when experiment is control', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Control
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Control,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(screen.getByText('emptyStateContent:tiles')).toBeOnTheScreen();
    expect(screen.getByText('emptyStateTitle:default')).toBeOnTheScreen();
  });

  it('asks PerpsSection to render pills for the empty state when experiment is treatment', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Treatment
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Treatment,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(screen.getByText('emptyStateContent:pills')).toBeOnTheScreen();
    expect(screen.getByText('emptyStateTitle:Perps movers')).toBeOnTheScreen();
  });
});
