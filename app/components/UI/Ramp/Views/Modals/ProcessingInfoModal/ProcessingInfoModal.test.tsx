import React from 'react';
import { screen } from '@testing-library/react-native';
import ProcessingInfoModal from './ProcessingInfoModal';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => ({
    providerName: 'Transak',
    providerSupportUrl: 'https://transak.com/support',
    statusDescription:
      'Card purchases typically take a few minutes. You can contact support if you have questions.',
  }),
}));

function render() {
  return renderWithProvider(<ProcessingInfoModal />, {
    state: { engine: { backgroundState } },
  });
}

describe('ProcessingInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render();
    expect(screen.getByTestId('processing-info-modal')).toBeTruthy();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders the close button', () => {
    render();
    expect(
      screen.getByTestId('processing-info-modal-close-button'),
    ).toBeTruthy();
  });

  it('renders description text', () => {
    render();
    expect(
      screen.getByText(
        'Card purchases typically take a few minutes. You can contact support if you have questions.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders support button with provider name', () => {
    render();
    expect(screen.getByText('Go to Transak support page')).toBeOnTheScreen();
  });
});
