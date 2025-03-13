import { skeleton } from './skeleton';
import { SkeletonElement } from '@metamask/snaps-sdk/jsx';
import { mockTheme } from '../../../../util/theme';

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
    const el: SkeletonElement = {
      type: 'Skeleton',
      props: {
        width: '75%',
        height: 40,
        borderRadius: 'full',
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
  });
});
