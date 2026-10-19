import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ActivityNetworkFilterSheet, {
  createActivityNetworkFilterNavDetails,
} from './ActivityNetworkFilterSheet';
import { ActivityScreenSelectorsIDs } from '../../ActivityScreen.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockOnCloseBottomSheet = jest.fn();
const mockOnNetworkSelect = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails:
    (root: string, routeName: string) => (params?: unknown) =>
      [root, { screen: routeName, params }] as const,
  useParams: () => ({
    selectedNetwork: null,
    onNetworkSelect: mockOnNetworkSelect,
  }),
}));

jest.mock('../../hooks/useNetworkFilterOptions', () => ({
  useNetworkFilterOptions: () => [
    {
      id: 'eip155:59144',
      name: 'Linea',
      caipChainId: 'eip155:59144',
      isSelected: false,
      imageSource: { uri: 'linea' },
    },
  ],
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    return {
      __esModule: true,
      default: ReactActual.forwardRef(
        (
          {
            children,
            testID,
            onClose,
            onOpen,
          }: {
            children?: React.ReactNode;
            testID?: string;
            onClose?: () => void;
            onOpen?: () => void;
          },
          ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
        ) => {
          ReactActual.useEffect(() => {
            onOpen?.();
          }, [onOpen]);
          ReactActual.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void) => {
              mockOnCloseBottomSheet(callback);
              mockGoBack();
              onClose?.();
              callback?.();
            },
          }));
          return <View testID={testID}>{children}</View>;
        },
      ),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    HeaderStandard: ({
      title,
      onClose,
    }: {
      title?: string;
      onClose?: () => void;
    }) => (
      <View>
        <Text>{title}</Text>
        <TouchableOpacity testID="close-button" onPress={onClose} />
      </View>
    ),
  };
});

jest.mock('../../../../../component-library/components/Cells/Cell', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  const CellVariant = { Select: 'Select' };
  const Cell = ({
    title,
    onPress,
    testID,
    children,
  }: {
    title?: string;
    onPress?: () => void;
    testID?: string;
    children?: React.ReactNode;
  }) => (
    <TouchableOpacity testID={testID ?? `cell-${title}`} onPress={onPress}>
      <Text>{title}</Text>
      {children}
    </TouchableOpacity>
  );
  Cell.CellVariant = CellVariant;
  return { __esModule: true, default: Cell, CellVariant };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: () => null,
  IconName: { Check: 'Check', Global: 'Global' },
  IconSize: { Md: 'Md' },
}));

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Sm: 'Sm' },
  AvatarVariant: { Icon: 'Icon', Network: 'Network' },
}));

describe('ActivityNetworkFilterSheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockOnCloseBottomSheet.mockClear();
    mockOnNetworkSelect.mockClear();
    mockCanGoBack.mockReturnValue(true);
  });
  it('renders the network filter sheet', () => {
    render(<ActivityNetworkFilterSheet />);
    expect(
      screen.getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_SHEET),
    ).toBeOnTheScreen();
    expect(screen.getByText('Linea')).toBeOnTheScreen();
  });
  it('calls onNetworkSelect then closes the sheet', () => {
    render(<ActivityNetworkFilterSheet />);
    fireEvent.press(screen.getByText('Linea'));
    expect(mockOnNetworkSelect).toHaveBeenCalledWith(['eip155:59144']);
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });
  it('calls onNetworkSelect with null for All networks', () => {
    render(<ActivityNetworkFilterSheet />);
    fireEvent.press(screen.getByText('All networks'));
    expect(mockOnNetworkSelect).toHaveBeenCalledWith(null);
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('exports createActivityNetworkFilterNavDetails targeting ROOT_MODAL_FLOW', () => {
    const onNetworkSelect = jest.fn();
    expect(
      createActivityNetworkFilterNavDetails({
        selectedNetwork: null,
        onNetworkSelect,
      }),
    ).toEqual([
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.SHEET.ACTIVITY_NETWORK_FILTER,
        params: { selectedNetwork: null, onNetworkSelect },
      },
    ]);
  });
});
