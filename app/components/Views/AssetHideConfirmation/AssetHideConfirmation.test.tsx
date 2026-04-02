import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AssetHideConfirmation from './index';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockDismissModal = jest.fn((callback?: () => void) => {
  if (callback) callback();
});

jest.mock('../../UI/ReusableModal', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (
      { children }: { children: React.ReactNode },
      ref: React.Ref<{ dismissModal: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        dismissModal: mockDismissModal,
      }));
      return <RNView testID="reusable-modal">{children}</RNView>;
    },
  );
});

const mockOnConfirm = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({ params: { onConfirm: mockOnConfirm } }),
  };
});

const renderWithTheme = () =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      <AssetHideConfirmation />
    </ThemeContext.Provider>,
  );

describe('AssetHideConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    const { getByText } = renderWithTheme();
    expect(getByText('Hide token?')).toBeOnTheScreen();
  });

  it('renders the description', () => {
    const { getByText } = renderWithTheme();
    expect(getByText(/You can add this token back in the future/)).toBeOnTheScreen();
  });

  it('renders cancel and confirm buttons', () => {
    const { getByText } = renderWithTheme();
    expect(getByText('Cancel')).toBeOnTheScreen();
    expect(getByText('Confirm')).toBeOnTheScreen();
  });

  it('dismisses modal without calling onConfirm when cancel is pressed', () => {
    const { getByText } = renderWithTheme();

    fireEvent.press(getByText('Cancel'));

    expect(mockDismissModal).toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm via dismissModal when confirm is pressed', () => {
    const { getByText } = renderWithTheme();

    fireEvent.press(getByText('Confirm'));

    expect(mockDismissModal).toHaveBeenCalledWith(mockOnConfirm);
    expect(mockOnConfirm).toHaveBeenCalled();
  });
});
