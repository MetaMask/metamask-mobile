import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import OptionSelectorModal from './OptionSelectorModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

// Mock BottomSheet so onCloseBottomSheet immediately invokes its callback
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        {
          children,
          goBack,
        }: { children: React.ReactNode; goBack?: () => void },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            goBack?.();
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));
        return <>{children}</>;
      },
    ),
  };
});

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
    isFocused: jest.fn(() => true),
  }),
}));

const mockOnSelect = jest.fn();
let mockParams: {
  title: string;
  options: { name: string; value: string }[];
  selectedValue?: string;
  onSelect: (value: string) => void;
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockParams),
}));

function renderModal() {
  return renderScreen(
    OptionSelectorModal,
    { name: 'OptionSelectorModal' },
    { state: { engine: { backgroundState } } },
  );
}

describe('OptionSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
      title: 'Source of funds',
      options: [
        { name: 'Salary payments', value: 'salary_payment' },
        { name: 'Savings', value: 'savings' },
        { name: 'Pension', value: 'pension' },
      ],
      selectedValue: undefined,
      onSelect: mockOnSelect,
    };
  });

  it('renders the title and every option', () => {
    const { getByText } = renderModal();

    expect(getByText('Source of funds')).toBeTruthy();
    expect(getByText('Salary payments')).toBeTruthy();
    expect(getByText('Savings')).toBeTruthy();
    expect(getByText('Pension')).toBeTruthy();
  });

  it('reports the chosen value and closes the sheet', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId('option-selector-item-savings'));

    expect(mockOnSelect).toHaveBeenCalledWith('savings');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('closes without selecting when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId('option-selector-close-button'));

    expect(mockOnSelect).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
