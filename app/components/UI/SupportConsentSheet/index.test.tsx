import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useRoute } from '@react-navigation/native';
import SupportConsentSheet from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';

const mockGoBack = jest.fn();
const mockOnConfirm = jest.fn();
const mockOnReject = jest.fn();

// eslint-disable-next-line import-x/no-commonjs
jest.mock('@metamask/design-system-react-native', () => {
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs, @typescript-eslint/no-var-requires
  const ReactMock = require('react');

  return {
    ...actualDesignSystem,
    BottomSheet: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactMock.createElement('View', { testID }, children),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: jest.fn(),
}));

describe('SupportConsentSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRoute).mockReturnValue({
      params: { onConfirm: mockOnConfirm, onReject: mockOnReject },
    } as unknown as ReturnType<typeof useRoute>);
  });

  it('renders the approved title and description', () => {
    const { getByText } = renderWithProvider(<SupportConsentSheet />);

    expect(getByText(strings('support_consent.title'))).toBeOnTheScreen();
    expect(getByText(strings('support_consent.description'))).toBeOnTheScreen();
  });

  it('closes the sheet and calls onConfirm when the confirm button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SupportConsentSheet />);

    fireEvent.press(getByTestId('support-consent-sheet-confirm-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('closes the sheet and calls onReject when the reject button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SupportConsentSheet />);

    fireEvent.press(getByTestId('support-consent-sheet-reject-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('dismisses the sheet without calling onConfirm or onReject when the header close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SupportConsentSheet />);

    fireEvent.press(getByTestId('support-consent-sheet-close-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnReject).not.toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('renders without crashing when route params are missing', () => {
    jest
      .mocked(useRoute)
      .mockReturnValue({ params: undefined } as unknown as ReturnType<
        typeof useRoute
      >);

    expect(() => renderWithProvider(<SupportConsentSheet />)).not.toThrow();
  });
});
