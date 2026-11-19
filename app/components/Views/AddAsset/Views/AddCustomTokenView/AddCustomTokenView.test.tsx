import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import AddCustomTokenView from './AddCustomTokenView';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const mockAddCustomToken = jest.fn();
jest.mock('../../components/AddCustomToken/AddCustomToken', () => {
  const { View } = jest.requireActual('react-native');
  return (props: unknown) => {
    mockAddCustomToken(props);
    return <View testID="add-custom-token" />;
  };
});

jest.mock(
  '../../components/NetworkListBottomSheet/NetworkListBottomSheet',
  () => {
    const { Pressable } = jest.requireActual('react-native');
    return ({
      setSelectedNetwork,
      setOpenNetworkSelector,
    }: {
      setSelectedNetwork: (chainId: string) => void;
      setOpenNetworkSelector: (open: boolean) => void;
    }) => (
      <Pressable
        testID="pick-localhost"
        onPress={() => {
          setSelectedNetwork('0x539');
          setOpenNetworkSelector(false);
        }}
      />
    );
  },
);

const renderView = () =>
  renderWithProvider(<AddCustomTokenView />, {
    state: { engine: { backgroundState } },
  });

const lastProps = () =>
  mockAddCustomToken.mock.calls[mockAddCustomToken.mock.calls.length - 1][0];

describe('AddCustomTokenView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts on Ethereum Mainnet with token detection supported', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_CONTAINER),
    ).toBeOnTheScreen();
    expect(lastProps()).toMatchObject({
      chainId: '0x1',
      isTokenDetectionSupported: true,
    });
  });

  it('switches network from the picker and reports unsupported detection', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
    );
    fireEvent.press(getByTestId('pick-localhost'));

    expect(lastProps()).toMatchObject({
      chainId: '0x539',
      isTokenDetectionSupported: false,
    });
  });
});
