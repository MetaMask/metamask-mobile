import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictHomeFeaturedSkeleton from './PredictHomeFeaturedSkeleton';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: (string | boolean | undefined)[]) => ({
      testStyle: classes.filter(Boolean).join(' '),
    }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <ReactNative.View testID={testID} {...props}>
        {children}
      </ReactNative.View>
    ),
    BoxFlexDirection: { Row: 'row' },
  };
});

jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ testID }: { testID?: string }) => (
        <ReactNative.View testID={testID || 'skeleton'} />
      ),
    };
  },
);

describe('PredictHomeFeaturedSkeleton', () => {
  describe('rendering', () => {
    it('renders container with default testID', () => {
      render(<PredictHomeFeaturedSkeleton variant="carousel" />);

      expect(
        screen.getByTestId('predict-home-featured-skeleton'),
      ).toBeOnTheScreen();
    });

    it('renders container with custom testID', () => {
      render(
        <PredictHomeFeaturedSkeleton variant="list" testID="custom-skeleton" />,
      );

      expect(screen.getByTestId('custom-skeleton')).toBeOnTheScreen();
    });

    it('renders list skeleton when variant is list', () => {
      render(<PredictHomeFeaturedSkeleton variant="list" />);

      expect(
        screen.getByTestId('predict-home-featured-skeleton-list'),
      ).toBeOnTheScreen();
    });

    it('renders carousel skeleton when variant is carousel', () => {
      render(<PredictHomeFeaturedSkeleton variant="carousel" />);

      expect(
        screen.getByTestId('predict-home-featured-skeleton-carousel'),
      ).toBeOnTheScreen();
    });
  });
});
