import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TokenUnavailableForProviderModal from './TokenUnavailableForProviderModal';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const mockOnCloseBottomSheet = jest.fn();

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
        }: {
          children: React.ReactNode;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

const mockOnChangeToken = jest.fn();
const mockOnChangeProvider = jest.fn();

const defaultProps = {
  tokenName: 'USDC',
  providerName: 'Transak',
  onChangeToken: mockOnChangeToken,
  onChangeProvider: mockOnChangeProvider,
};

const renderWithTheme = (props = defaultProps) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <TokenUnavailableForProviderModal {...props} />
    </ThemeContext.Provider>,
  );

describe('TokenUnavailableForProviderModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme();

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onChangeToken when Change token is pressed', () => {
    const { getByText } = renderWithTheme();

    fireEvent.press(getByText('Change token'));

    expect(mockOnChangeToken).toHaveBeenCalledTimes(1);
  });

  it('calls onChangeProvider when Change provider is pressed', () => {
    const { getByText } = renderWithTheme();

    fireEvent.press(getByText('Change provider'));

    expect(mockOnChangeProvider).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = renderWithTheme();
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
