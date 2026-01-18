import React from 'react';
import { render } from '@testing-library/react-native';
import AmountInput from './AmountInput';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('AmountInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('displays Amount Input Screen heading', () => {
    const { getByText } = renderWithTheme(<AmountInput />);

    expect(getByText('Amount Input Screen')).toBeOnTheScreen();
  });

  it('displays the assetId from route params', () => {
    const { getByText } = renderWithTheme(<AmountInput />);

    expect(
      getByText(
        'Asset ID: eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ),
    ).toBeOnTheScreen();
  });

  it('sets navigation options on mount', () => {
    renderWithTheme(<AmountInput />);

    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<AmountInput />);

    expect(toJSON()).toMatchSnapshot();
  });
});
