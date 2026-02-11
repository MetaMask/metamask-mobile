import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { useDispatch } from 'react-redux';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MusdDeveloperOptionsSection } from './MusdDeveloperOptionsSection';
import {
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
  UserActionType: {
    SET_MUSD_CONVERSION_EDUCATION_SEEN: 'SET_MUSD_CONVERSION_EDUCATION_SEEN',
  },
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: {
      background: { default: '#FFFFFF' },
      text: { default: '#000000' },
    },
    themeAppearance: 'light',
    typography: {},
    shadows: {},
    brandColors: {},
  }),
}));

describe('MusdDeveloperOptionsSection', () => {
  const mockUseDispatch = jest.mocked(useDispatch);
  const mockSetMusdConversionEducationSeen = jest.mocked(
    setMusdConversionEducationSeen,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    mockSetMusdConversionEducationSeen.mockImplementation((seen: boolean) => ({
      type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
      payload: { seen },
    }));
  });

  it('renders the status label from redux state', () => {
    const { getByText } = renderWithProvider(<MusdDeveloperOptionsSection />, {
      state: { user: { musdConversionEducationSeen: true } },
    });

    expect(getByText('Education screen seen: true')).toBeOnTheScreen();
  });

  it('dispatches reset action when reset button pressed', async () => {
    const { getByText } = renderWithProvider(<MusdDeveloperOptionsSection />, {
      state: { user: { musdConversionEducationSeen: true } },
    });

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
