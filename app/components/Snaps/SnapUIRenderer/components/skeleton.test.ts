import { skeleton } from './skeleton';
import { SkeletonElement } from '@metamask/snaps-sdk/jsx';
import { mapSnapBorderRadiusToMobileBorderRadius } from '../utils';
import { mockTheme } from '../../../../util/theme';

jest.mock('../utils', () => ({
  mapSnapBorderRadiusToMobileBorderRadius: jest.fn((value) => value),
}));

describe('skeleton component', () => {
  const defaultParams = {
    map: {},
    t: jest.fn(),
    theme: mockTheme,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render skeleton with default props', () => {
    const el: SkeletonElement = {
      type: 'Skeleton',
      props: {},
      key: null,
    };

    const result = skeleton({ element: el, ...defaultParams });

    expect(result).toEqual({
      element: 'Skeleton',
      props: {
        width: '100%',
        height: 22,
        style: {
          borderRadius: 6,
        },
      },
    });
  });

  it('should render skeleton with all custom props', () => {
    const mockBorderRadius = 'full';
    (mapSnapBorderRadiusToMobileBorderRadius as jest.Mock).mockReturnValue(
      9999,
    );

    const el: SkeletonElement = {
      type: 'Skeleton',
      props: {
        width: '75%',
        height: 40,
        borderRadius: mockBorderRadius,
      },
      key: null,
    };

    const result = skeleton({ element: el, ...defaultParams });

    expect(result).toEqual({
      element: 'Skeleton',
      props: {
        width: '75%',
        height: 40,
        style: {
          borderRadius: 9999,
        },
      },
    });
    expect(mapSnapBorderRadiusToMobileBorderRadius).toHaveBeenCalledWith(
      mockBorderRadius,
    );
  });
});
