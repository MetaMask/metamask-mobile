import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProviderPickerModal from './ProviderPickerModal';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';

const mockSetSelectedProvider = jest.fn();

let mockProviders = [
  {
    id: 'provider-1',
    name: 'Provider One',
    supportedCryptoCurrencies: { 'eip155:1/erc20:0x123': true },
  },
  {
    id: 'provider-2',
    name: 'Provider Two',
    supportedCryptoCurrencies: { 'eip155:1/erc20:0x123': true },
  },
  {
    id: 'provider-3',
    name: 'Provider Three',
    supportedCryptoCurrencies: { 'eip155:1/erc20:0x456': true },
  },
];

let mockSelectedProvider: unknown = null;

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    providers: mockProviders,
    selectedProvider: mockSelectedProvider,
    setSelectedProvider: mockSetSelectedProvider,
  }),
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (..._args: unknown[]) =>
    (params: unknown) => ['MockRoute', params],
  useParams: () => ({
    assetId: 'eip155:1/erc20:0x123',
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef } = jest.requireActual('react');
    return {
      __esModule: true,
      default: forwardRef(
        (
          { children, ...rest }: { children: React.ReactNode; testID?: string },
          _ref: unknown,
        ) =>
          jest
            .requireActual('react')
            .createElement(
              jest.requireActual('react-native').View,
              { testID: rest.testID || 'bottom-sheet' },
              children,
            ),
      ),
    };
  },
);

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
      }) => createElement(View, { testID: 'bottom-sheet-header' }, children),
    };
  },
);

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('ProviderPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedProvider = null;
    mockProviders = [
      {
        id: 'provider-1',
        name: 'Provider One',
        supportedCryptoCurrencies: { 'eip155:1/erc20:0x123': true },
      },
      {
        id: 'provider-2',
        name: 'Provider Two',
        supportedCryptoCurrencies: { 'eip155:1/erc20:0x123': true },
      },
      {
        id: 'provider-3',
        name: 'Provider Three',
        supportedCryptoCurrencies: { 'eip155:1/erc20:0x456': true },
      },
    ];
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<ProviderPickerModal />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders only providers compatible with the assetId', () => {
    const { getByText, queryByText } = renderWithTheme(<ProviderPickerModal />);

    expect(getByText('Provider One')).toBeOnTheScreen();
    expect(getByText('Provider Two')).toBeOnTheScreen();
    expect(queryByText('Provider Three')).toBeNull();
  });

  it('calls setSelectedProvider when a provider is pressed', () => {
    const { getByText } = renderWithTheme(<ProviderPickerModal />);

    fireEvent.press(getByText('Provider One'));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'provider-1' }),
    );
  });

  it('renders the title', () => {
    const { getByText } = renderWithTheme(<ProviderPickerModal />);
    expect(
      getByText('fiat_on_ramp.provider_picker_modal.title'),
    ).toBeOnTheScreen();
  });
});
