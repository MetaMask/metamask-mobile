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
    (root: string, screen: string) => (params?: unknown) =>
      [root, { screen, params }] as const,
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
    const ReactNative = jest.requireActual('react-native');
    const React = jest.requireActual('react');
    return {
      __esModule: true,
      default: React.forwardRef(
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
          React.useEffect(() => {
            onOpen?.();
          }, [onOpen]);
          React.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void) => {
              mockOnCloseBottomSheet(callback);
              mockGoBack();
              onClose?.();
              callback?.();
            },
          }));
          return (
            <ReactNative.View testID={testID}>{children}</ReactNative.View>
          );
        },
      ),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    HeaderStandard: ({
      title,
      onClose,
    }: {
      title?: string;
      onClose?: () => void;
    }) => (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        <ReactNative.TouchableOpacity testID="close-button" onPress={onClose} />
      </ReactNative.View>
    ),
  };
});

jest.mock('../../../../../component-library/components/Cells/Cell', () => {
  const ReactNative = jest.requireActual('react-native');
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
    <ReactNative.TouchableOpacity
      testID={testID ?? `cell-${title}`}
      onPress={onPress}
    >
      <ReactNative.Text>{title}</ReactNative.Text>
      {children}
    </ReactNative.TouchableOpacity>
  );
  Cell.CellVariant = CellVariant;
  return {
    __esModule: true,
    default: Cell,
    CellVariant,
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <ReactNative.View />,
    IconName: { Check: 'Check', Global: 'Global' },
    IconSize: { Md: 'Md' },
  };
});

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
        params: {
          selectedNetwork: null,
          onNetworkSelect,
        },
      },
    ]);
  });
});
