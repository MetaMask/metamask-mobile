import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MusdConversionInfoRoot } from './musd-conversion-info-root';

const MUSD_CONVERSION_INFO_TEST_ID = 'musd-conversion-info';
const MUSD_MAX_CONVERSION_INFO_TEST_ID = 'musd-max-conversion-info';

jest.mock('../musd-conversion-info', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MusdConversionInfo: () => <View testID="musd-conversion-info" />,
  };
});

jest.mock('../musd-max-conversion-info', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MusdMaxConversionInfo: () => <View testID="musd-max-conversion-info" />,
  };
});

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: (defaults?: Record<string, unknown>) =>
    mockUseParams(defaults) ?? defaults ?? {},
}));

describe('MusdConversionInfoRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MusdMaxConversionInfo when forceBottomSheet is true', () => {
    mockUseParams.mockReturnValue({
      forceBottomSheet: true,
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdConversionInfoRoot />,
    );

    expect(getByTestId(MUSD_MAX_CONVERSION_INFO_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(MUSD_CONVERSION_INFO_TEST_ID)).toBeNull();
  });

  it('renders MusdConversionInfo when forceBottomSheet is false', () => {
    mockUseParams.mockReturnValue({
      forceBottomSheet: false,
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdConversionInfoRoot />,
    );

    expect(getByTestId(MUSD_CONVERSION_INFO_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(MUSD_MAX_CONVERSION_INFO_TEST_ID)).toBeNull();
  });

  it('renders MusdConversionInfo when forceBottomSheet is undefined', () => {
    mockUseParams.mockReturnValue({});

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdConversionInfoRoot />,
    );

    expect(getByTestId(MUSD_CONVERSION_INFO_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(MUSD_MAX_CONVERSION_INFO_TEST_ID)).toBeNull();
  });
});
