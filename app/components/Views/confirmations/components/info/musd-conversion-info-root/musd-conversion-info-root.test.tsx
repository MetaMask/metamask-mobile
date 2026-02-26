import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MusdConversionInfoRoot } from './musd-conversion-info-root';
import { MusdConversionVariant } from '../../../../../UI/Earn/types/musd.types';

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

  it('renders MusdMaxConversionInfo when variant is QUICK_CONVERT', () => {
    mockUseParams.mockReturnValue({
      variant: MusdConversionVariant.QUICK_CONVERT,
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdConversionInfoRoot />,
    );

    expect(getByTestId(MUSD_MAX_CONVERSION_INFO_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(MUSD_CONVERSION_INFO_TEST_ID)).toBeNull();
  });

  it('renders MusdConversionInfo when variant is undefined', () => {
    mockUseParams.mockReturnValue({});

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdConversionInfoRoot />,
    );

    expect(getByTestId(MUSD_CONVERSION_INFO_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(MUSD_MAX_CONVERSION_INFO_TEST_ID)).toBeNull();
  });

  it('renders MusdConversionInfo when variant is a non-matching value', () => {
    mockUseParams.mockReturnValue({ variant: 'customAmount' });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <MusdConversionInfoRoot />,
    );

    expect(getByTestId(MUSD_CONVERSION_INFO_TEST_ID)).toBeOnTheScreen();
    expect(queryByTestId(MUSD_MAX_CONVERSION_INFO_TEST_ID)).toBeNull();
  });
});
