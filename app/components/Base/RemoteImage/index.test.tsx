import React from 'react';
import RemoteImage from './';
import { getFormattedIpfsUrl } from '@metamask/assets-controllers';
import { act, render, waitFor } from '@testing-library/react-native';
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
  it('renders the remote svg image snapshot', () => {
    const wrapper = render(
      <RemoteImage
        source={{
          uri: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
        }}
      />,
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('renders the remote png image snapshot', () => {
    const wrapper = render(
      <RemoteImage
        source={{
          uri: 'https://s3.amazonaws.com/airswap-token-images/OXT.png',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders the remote ipfs image snapshot', async () => {
    const testIpfsUri = 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23';
    mockGetFormattedIpfsUrl.mockResolvedValue(testIpfsUri);
    const { toJSON, getByTestId } = render(
      <RemoteImage
        source={{
          uri: testIpfsUri,
        }}
      />,
    );
    await waitFor(() =>
      expect(getByTestId('mock-expo-image')).toHaveProp('source', {
        uri: testIpfsUri,
      }),
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders remote solana image and badge snapshot', async () => {
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
});
