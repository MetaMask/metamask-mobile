import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MultichainAccountsHeader from './MultichainAccountsHeader';

let mockGlassHeadersEnabled = false;

jest.mock(
  '../../../../../selectors/featureFlagController/glassHeaders',
  () => ({
    selectGlassHeadersEnabled: () => mockGlassHeadersEnabled,
  }),
);

const mockHeaderStandardGlass = jest.fn();

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const actual = jest.requireActual(
      '../../../../../component-library/components-temp/HeaderStandardGlass',
    );
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => {
        mockHeaderStandardGlass(props);
        return ReactActual.createElement(actual.default, props);
      },
    };
  },
);

const TITLE = 'Addresses';
const BACK_BUTTON_TEST_ID = 'multichain-accounts-header-back';

describe('MultichainAccountsHeader', () => {
  const mockOnBack = jest.fn();

  const renderHeader = () =>
    renderWithProvider(
      <MultichainAccountsHeader
        title={TITLE}
        onBack={mockOnBack}
        backButtonProps={{ testID: BACK_BUTTON_TEST_ID }}
        includesTopInset
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGlassHeadersEnabled = false;
  });

  it('renders a plain in-flow header when glassHeaders is off', () => {
    const { getByText, getByTestId } = renderHeader();

    fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

    expect(getByText(TITLE)).toBeOnTheScreen();
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockHeaderStandardGlass).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isGlass: false,
        isFloating: false,
        includesTopInset: true,
      }),
    );
  });

  it('renders a glass in-flow header when glassHeaders is on', () => {
    mockGlassHeadersEnabled = true;

    const { getByText, getByTestId } = renderHeader();

    fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

    expect(getByText(TITLE)).toBeOnTheScreen();
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    expect(mockHeaderStandardGlass).toHaveBeenLastCalledWith(
      expect.objectContaining({ isGlass: true, isFloating: false }),
    );
  });
});
