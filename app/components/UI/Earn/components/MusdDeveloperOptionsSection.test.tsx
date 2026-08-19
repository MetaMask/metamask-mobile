import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MusdDeveloperOptionsSection } from './MusdDeveloperOptionsSection';
import {
  clearMusdConversionAssetDetailCtasSeen,
  setMusdConversionEducationSeen,
  UserActionType,
} from '../../../../actions/user';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../actions/user', () => ({
  setMusdConversionEducationSeen: jest.fn(),
  clearMusdConversionAssetDetailCtasSeen: jest.fn(),
  UserActionType: {
    SET_MUSD_CONVERSION_EDUCATION_SEEN: 'SET_MUSD_CONVERSION_EDUCATION_SEEN',
    CLEAR_MUSD_CONVERSION_ASSET_DETAIL_CTAS_SEEN:
      'CLEAR_MUSD_CONVERSION_ASSET_DETAIL_CTAS_SEEN',
  },
}));

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

describe('MusdDeveloperOptionsSection', () => {
  const mockUseDispatch = jest.mocked(useDispatch);
  const mockSetMusdConversionEducationSeen = jest.mocked(
    setMusdConversionEducationSeen,
  );
  const mockClearMusdConversionAssetDetailCtasSeen = jest.mocked(
    clearMusdConversionAssetDetailCtasSeen,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    mockSetMusdConversionEducationSeen.mockImplementation((seen: boolean) => ({
      type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
      payload: { seen },
    }));
    mockClearMusdConversionAssetDetailCtasSeen.mockImplementation(() => ({
      type: UserActionType.CLEAR_MUSD_CONVERSION_ASSET_DETAIL_CTAS_SEEN,
    }));
  });

  describe('education screen reset', () => {
    it('renders whether the education screen has been seen from Redux state', () => {
      const { getByText } = renderWithProvider(
        <MusdDeveloperOptionsSection />,
        {
          state: { user: { musdConversionEducationSeen: true } },
        },
      );

      expect(getByText('Education screen seen: true')).toBeOnTheScreen();
    });

    it('dispatches reset when the reset education screen button is pressed', async () => {
      const { getByText } = renderWithProvider(
        <MusdDeveloperOptionsSection />,
        {
          state: { user: { musdConversionEducationSeen: true } },
        },
      );

      await act(async () => {
        fireEvent.press(getByText('Reset education screen'));
      });

      expect(mockSetMusdConversionEducationSeen).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
        payload: { seen: false },
      });
    });
  });

  describe('asset detail CTA dismissals', () => {
    it('renders the dismissed CTA count from Redux state', () => {
      const { getByText } = renderWithProvider(
        <MusdDeveloperOptionsSection />,
        {
          state: {
            user: {
              musdConversionEducationSeen: false,
              musdConversionAssetDetailCtasSeen: {
                '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
                '0xe708-0xdac17f958d2ee523a2206206994597c13d831ec7': true,
              },
            },
          },
        },
      );

      expect(getByText('Asset detail CTAs dismissed: 2')).toBeOnTheScreen();
    });

    it('renders dismissed count as 0 when none are stored', () => {
      const { getByText } = renderWithProvider(
        <MusdDeveloperOptionsSection />,
        {
          state: {
            user: {
              musdConversionEducationSeen: false,
              musdConversionAssetDetailCtasSeen: {},
            },
          },
        },
      );

      expect(getByText('Asset detail CTAs dismissed: 0')).toBeOnTheScreen();
    });

    it('dispatches clear when the clear asset detail CTAs seen button is pressed', async () => {
      const { getByText } = renderWithProvider(
        <MusdDeveloperOptionsSection />,
        {
          state: {
            user: {
              musdConversionEducationSeen: false,
              musdConversionAssetDetailCtasSeen: {
                '0x1-0xabc': true,
              },
            },
          },
        },
      );

      await act(async () => {
        fireEvent.press(getByText('Clear asset detail CTAs seen'));
      });

      expect(mockClearMusdConversionAssetDetailCtasSeen).toHaveBeenCalledTimes(
        1,
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: UserActionType.CLEAR_MUSD_CONVERSION_ASSET_DETAIL_CTAS_SEEN,
      });
    });
  });
});
