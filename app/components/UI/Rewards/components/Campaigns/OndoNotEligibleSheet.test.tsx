import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoNotEligibleSheet, {
  ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS,
} from './OndoNotEligibleSheet';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({
      children,
      onClose,
      testID,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'sheet-backdrop-close',
          onPress: onClose,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}(${JSON.stringify(params)})`;
    return key;
  },
}));

describe('OndoNotEligibleSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the container testID', () => {
    const { getByTestId } = render(
      <OndoNotEligibleSheet onClose={mockOnClose} onConfirm={mockOnConfirm} />,
    );
    expect(
      getByTestId(ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.CONTAINER),
    ).toBeDefined();
  });

  it('renders title and body text', () => {
    const { getByTestId } = render(
      <OndoNotEligibleSheet onClose={mockOnClose} onConfirm={mockOnConfirm} />,
    );
    expect(getByTestId(ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.TITLE)).toBeDefined();
    expect(getByTestId(ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.BODY)).toBeDefined();
  });

  it('calls onClose when cancel button is pressed', () => {
    const { getByTestId } = render(
      <OndoNotEligibleSheet onClose={mockOnClose} onConfirm={mockOnConfirm} />,
    );
    fireEvent.press(getByTestId(ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.CANCEL));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByTestId } = render(
      <OndoNotEligibleSheet onClose={mockOnClose} onConfirm={mockOnConfirm} />,
    );
    fireEvent.press(getByTestId(ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.CONFIRM));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the close icon button is pressed', () => {
    const { getByTestId } = render(
      <OndoNotEligibleSheet onClose={mockOnClose} onConfirm={mockOnConfirm} />,
    );
    fireEvent.press(getByTestId('ondo-not-eligible-sheet-close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
