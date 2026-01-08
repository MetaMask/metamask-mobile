import React from 'react';
import { shallow } from 'enzyme';
import RemoteImage from './';
import { getFormattedIpfsUrl } from '@metamask/assets-controllers';
import { act, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => 'https://dweb.link/ipfs/'),
}));

jest.mock('../../../components/hooks/useIpfsGateway', () => jest.fn());

jest.mock('@metamask/assets-controllers', () => ({
  getFormattedIpfsUrl: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isSolanaMainnet: jest.fn(),
}));

const mockGetFormattedIpfsUrl = getFormattedIpfsUrl as jest.Mock;

describe('RemoteImage', () => {
  it('should render svg correctly', () => {
    const wrapper = shallow(
      <RemoteImage
        source={{
          uri: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render static sources', () => {
    const wrapper = shallow(
      <RemoteImage
        source={{
          uri: 'https://s3.amazonaws.com/airswap-token-images/OXT.png',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render ipfs sources', async () => {
    const testIpfsUri = 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23';
    mockGetFormattedIpfsUrl.mockResolvedValue(testIpfsUri);
    const wrapper = render(
      <RemoteImage
        source={{
          uri: testIpfsUri,
        }}
      />,
    );
    // eslint-disable-next-line no-empty-function
    await act(async () => {});
    expect(wrapper).toMatchSnapshot();
  });

  it('should render with Solana network badge when on Solana network', async () => {
    // @ts-expect-error - useSelector is mocked in the top of the file
    useSelector.mockImplementation((selector) => {
      const mockState = {
        engine: {
          backgroundState: {
            ...backgroundState,
            MultichainNetworkController: {
              ...backgroundState.MultichainNetworkController,
              isEvmSelected: false,
            },
          },
        },
      };
      return selector(mockState);
    });

    const wrapper = render(
      <RemoteImage
        fadeIn
        isTokenImage
        source={{
          uri: 'https://example.com/token.png',
        }}
      />,
    );

    // eslint-disable-next-line no-empty-function
    await act(async () => {});
    expect(wrapper).toMatchSnapshot();
  });

  describe('Error State Reset', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders image when source URI changes', async () => {
      const { rerender, queryByTestId } = render(
        <RemoteImage
          source={{ uri: 'https://example.com/image1.png' }}
          testID="remote-image"
        />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(queryByTestId('remote-image')).toBeOnTheScreen();

      await act(async () => {
        rerender(
          <RemoteImage
            source={{ uri: 'https://example.com/image2.png' }}
            testID="remote-image"
          />,
        );
        jest.runAllTimers();
      });

      expect(queryByTestId('remote-image')).toBeOnTheScreen();
    });

    it('renders Identicon when address is provided', async () => {
      const { queryByTestId } = render(
        <RemoteImage
          source={{ uri: 'https://example.com/image.png' }}
          address="0x123"
          testID="remote-image"
        />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(queryByTestId('remote-image')).toBeOnTheScreen();
    });

    it('renders new image after source changes', async () => {
      const { rerender, queryByTestId } = render(
        <RemoteImage
          source={{ uri: 'https://example.com/invalid1.png' }}
          testID="remote-image-1"
        />,
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(queryByTestId('remote-image-1')).toBeOnTheScreen();

      await act(async () => {
        rerender(
          <RemoteImage
            source={{ uri: 'https://example.com/valid.png' }}
            testID="remote-image-2"
          />,
        );
        jest.runAllTimers();
      });

      expect(queryByTestId('remote-image-2')).toBeOnTheScreen();
    });
  });
});
