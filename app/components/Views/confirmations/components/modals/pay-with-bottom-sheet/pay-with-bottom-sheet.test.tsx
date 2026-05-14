import React from 'react';
import { render } from '@testing-library/react-native';
import {
  PayWithBottomSheet,
  PAY_WITH_BOTTOM_SHEET_TEST_ID,
} from './pay-with-bottom-sheet';
import { usePayWithSections } from '../../../hooks/pay/usePayWithSections';
import { PayWithSectionConfig } from './pay-with-bottom-sheet.types';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../hooks/pay/usePayWithSections');
jest.mock('../../../hooks/pay/useDismissOnPayTokenChange');
jest.mock('../../../hooks/pay/useDismissOnFiatPaymentChange');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView, Text: RNText } = jest.requireActual('react-native');
  return {
    BottomSheet: ReactActual.forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        _ref: unknown,
      ) => <RNView testID={testID}>{children}</RNView>,
    ),
    BottomSheetHeader: ({ children }: { children: React.ReactNode }) => (
      <RNView testID="bottom-sheet-header">{children}</RNView>
    ),
    Text: ({ children, ...props }: { children: React.ReactNode }) => (
      <RNText {...props}>{children}</RNText>
    ),
    TextVariant: { HeadingSm: 'heading-sm' },
  };
});

jest.mock('../../UI/pay-with-section', () => {
  const { View: RNView, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ config }: { config: PayWithSectionConfig }) => (
      <RNView testID={`mock-section-${config.id}`}>
        <RNText>{config.title}</RNText>
      </RNView>
    ),
  };
});

const usePayWithSectionsMock = jest.mocked(usePayWithSections);

describe('PayWithBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePayWithSectionsMock.mockReturnValue({ sections: [] });
  });

  it('renders the bottom sheet container with title', () => {
    const { getByTestId, getByText } = render(<PayWithBottomSheet />);

    expect(getByTestId(PAY_WITH_BOTTOM_SHEET_TEST_ID)).toBeOnTheScreen();
    expect(getByText('confirm.pay_with_bottom_sheet.title')).toBeOnTheScreen();
  });

  it('renders no sections when usePayWithSections returns empty array', () => {
    usePayWithSectionsMock.mockReturnValue({ sections: [] });

    const { queryByTestId } = render(<PayWithBottomSheet />);

    expect(queryByTestId('mock-section-crypto')).not.toBeOnTheScreen();
  });

  it('renders one section per config returned by usePayWithSections', () => {
    usePayWithSectionsMock.mockReturnValue({
      sections: [
        {
          id: 'crypto',
          title: 'Crypto',
          rows: [],
        },
        {
          id: 'bank-card',
          title: 'Bank and card',
          rows: [],
        },
      ],
    });

    const { getByTestId } = render(<PayWithBottomSheet />);

    expect(getByTestId('mock-section-crypto')).toBeOnTheScreen();
    expect(getByTestId('mock-section-bank-card')).toBeOnTheScreen();
  });
});
