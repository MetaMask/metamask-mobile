import React from 'react';
import RemoteImage from './';
import { getFormattedIpfsUrl } from '@metamask/assets-controllers';
import { act, render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import Logger from '../../../util/Logger';
import { Dimensions } from 'react-native';
import { Image } from 'expo-image';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation(() => 'https://dweb.link/ipfs/'),
}));

jest.mock('../../../components/hooks/useIpfsGateway', () => ({
  __esModule: true,
  default: jest.fn(() => 'https://dweb.link/ipfs/'),
}));

jest.mock('@metamask/assets-controllers', () => ({
  getFormattedIpfsUrl: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isSolanaMainnet: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../UI/Identicon', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ address }: { address?: string; customStyle?: object }) =>
      ReactActual.createElement(MockText, { testID: 'identicon' }, address),
  };
});

jest.mock('./RemoteImageBadgeWrapper', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const mockGetFormattedIpfsUrl = getFormattedIpfsUrl as jest.Mock;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('RemoteImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFormattedIpfsUrl.mockResolvedValue(false);
  });

  it('renders svg correctly', () => {
    const { toJSON } = render(
      <RemoteImage
        source={{
          uri: 'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/dai.svg',
        }}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders static sources', () => {
    const { toJSON } = render(
      <RemoteImage
        source={{
          uri: 'https://s3.amazonaws.com/airswap-token-images/OXT.png',
        }}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders ipfs sources', async () => {
    const testIpfsUri = 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23';
    mockGetFormattedIpfsUrl.mockResolvedValue(testIpfsUri);

    const wrapper = render(
      <RemoteImage
        source={{
          uri: testIpfsUri,
        }}
      />,
    );

    await act(async () => {
      // Wait for IPFS URL resolution
    });

    expect(wrapper).toMatchSnapshot();
  });

  it('renders with Solana network badge when on Solana network', async () => {
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

    await act(async () => {
      // Wait for component to render
    });

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

  describe('Error Handling', () => {
    it('renders Identicon when image fails to load and address is provided', async () => {
      const { UNSAFE_getByType, findByTestId } = render(
        <RemoteImage
          source={{ uri: 'https://example.com/invalid.png' }}
          address="0x1234567890abcdef"
          testID="remote-image"
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onError({ error: 'Failed to load image' });
      });

      const identicon = await findByTestId('identicon');
      expect(identicon).toBeOnTheScreen();
    });

    it('calls onError callback when image fails to load', async () => {
      const mockOnError = jest.fn();

      const { UNSAFE_getByType } = render(
        <RemoteImage
          source={{ uri: 'https://example.com/invalid.png' }}
          onError={mockOnError}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onError({ error: 'Failed to load image' });
      });

      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('resets error state when source URI changes', async () => {
      const { UNSAFE_getByType, findByTestId, queryByTestId, rerender } =
        render(
          <RemoteImage
            source={{ uri: 'https://example.com/invalid.png' }}
            address="0x1234567890abcdef"
          />,
        );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onError({ error: 'Failed to load image' });
      });

      // After error, Identicon should be rendered
      const identicon = await findByTestId('identicon');
      expect(identicon).toBeOnTheScreen();

      await act(async () => {
        rerender(
          <RemoteImage
            source={{ uri: 'https://example.com/valid.png' }}
            address="0x1234567890abcdef"
          />,
        );
      });

      // After source change, error should be reset and Image should render
      expect(queryByTestId('identicon')).not.toBeOnTheScreen();
      const image = UNSAFE_getByType(Image);
      expect(image).toBeDefined();
    });
  });

  describe('IPFS URL Resolution', () => {
    it('resolves IPFS URL successfully', async () => {
      const ipfsUri = 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23';
      const resolvedUrl =
        'https://dweb.link/ipfs/QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23';
      mockGetFormattedIpfsUrl.mockResolvedValue(resolvedUrl);

      const { UNSAFE_getByType } = render(
        <RemoteImage source={{ uri: ipfsUri }} />,
      );

      await waitFor(() => {
        expect(mockGetFormattedIpfsUrl).toHaveBeenCalled();
      });

      // Verify the function was called with the IPFS URI
      expect(mockGetFormattedIpfsUrl).toHaveBeenCalledWith(
        expect.any(String),
        ipfsUri,
        false,
      );

      const image = UNSAFE_getByType(Image);
      expect(image.props.source.uri).toBe(resolvedUrl);
    });

    it('handles IPFS URL resolution failure', async () => {
      const ipfsUri = 'ipfs://invalid';
      mockGetFormattedIpfsUrl.mockRejectedValue(new Error('Failed to resolve'));

      render(<RemoteImage source={{ uri: ipfsUri }} />);

      await waitFor(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          `Failed to resolve IPFS URL for ${ipfsUri}`,
        );
      });
    });

    it('handles source without URI', async () => {
      const { UNSAFE_getByType } = render(<RemoteImage source={{ uri: '' }} />);

      await act(async () => {
        // Wait for component to render
      });

      const image = UNSAFE_getByType(Image);
      expect(image.props.source.uri).toBe('');
    });
  });

  describe('Image Dimensions', () => {
    let dimensionsSpy: jest.SpyInstance;

    beforeEach(() => {
      dimensionsSpy = jest.spyOn(Dimensions, 'get').mockReturnValue({
        width: 400,
        height: 800,
        scale: 1,
        fontScale: 1,
      });
    });

    afterEach(() => {
      dimensionsSpy.mockRestore();
    });

    it('calculates dimensions for horizontal image', async () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          isFullRatio
          source={{ uri: 'https://example.com/image.png' }}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({
          source: { width: 800, height: 400 },
        });
      });

      const image = UNSAFE_getByType(Image);
      expect(image.props.style.width).toBe(368);
      expect(image.props.style.height).toBe(184);
    });

    it('calculates dimensions for vertical image', async () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          isFullRatio
          source={{ uri: 'https://example.com/image.png' }}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({
          source: { width: 400, height: 800 },
        });
      });

      const image = UNSAFE_getByType(Image);
      expect(image.props.style.width).toBe(138);
      expect(image.props.style.height).toBe(276);
    });

    it('calculates dimensions for square image', async () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          isFullRatio
          source={{ uri: 'https://example.com/image.png' }}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({
          source: { width: 500, height: 500 },
        });
      });

      const image = UNSAFE_getByType(Image);
      expect(image.props.style.width).toBe(276);
      expect(image.props.style.height).toBe(276);
    });

    it('does not update dimensions when they remain the same', async () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          isFullRatio
          source={{ uri: 'https://example.com/image.png' }}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({
          source: { width: 500, height: 500 },
        });
      });

      const firstImage = UNSAFE_getByType(Image);
      const firstStyle = firstImage.props.style;

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({
          source: { width: 500, height: 500 },
        });
      });

      const secondImage = UNSAFE_getByType(Image);
      const secondStyle = secondImage.props.style;

      expect(firstStyle.width).toBe(secondStyle.width);
      expect(firstStyle.height).toBe(secondStyle.height);
    });

    it('handles onLoad without width and height', async () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          isFullRatio
          source={{ uri: 'https://example.com/image.png' }}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({ source: {} });
      });

      const image = UNSAFE_getByType(Image);
      expect(image).toBeDefined();
    });
  });

  describe('Rendering Modes', () => {
    it('renders default image without fadeIn', () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage source={{ uri: 'https://example.com/image.png' }} />,
      );

      const image = UNSAFE_getByType(Image);
      expect(image).toBeDefined();
      expect(image.props.source.uri).toBe('https://example.com/image.png');
    });

    it('renders with fadeIn but not as token image', async () => {
      const testPlaceholderStyle = { backgroundColor: '#808080' };
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          source={{ uri: 'https://example.com/image.png' }}
          placeholderStyle={testPlaceholderStyle}
        />,
      );

      await act(async () => {
        // Wait for component to render
      });

      const image = UNSAFE_getByType(Image);
      expect(image).toBeDefined();
      expect(image.props.source.uri).toBe('https://example.com/image.png');
    });

    it('renders token image without full ratio', async () => {
      const testStyle = { width: 50, height: 50 };
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          source={{ uri: 'https://example.com/token.png' }}
          style={testStyle}
        />,
      );

      await act(async () => {
        // Wait for component to render
      });

      const image = UNSAFE_getByType(Image);
      expect(image).toBeDefined();
      expect(image.props.source.uri).toBe('https://example.com/token.png');
    });

    it('renders token image with full ratio and dimensions', async () => {
      jest.spyOn(Dimensions, 'get').mockReturnValue({
        width: 400,
        height: 800,
        scale: 1,
        fontScale: 1,
      });

      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          isFullRatio
          source={{ uri: 'https://example.com/token.png' }}
        />,
      );

      await act(async () => {
        const image = UNSAFE_getByType(Image);
        image.props.onLoad({
          source: { width: 600, height: 400 },
        });
      });

      const image = UNSAFE_getByType(Image);
      expect(image.props.style.width).toBe(368);
      expect(image.props.style.height).toBeCloseTo(245.33, 1);
    });

    it('renders token image with chainId prop', async () => {
      const { UNSAFE_getByType } = render(
        <RemoteImage
          fadeIn
          isTokenImage
          chainId={1}
          source={{ uri: 'https://example.com/token.png' }}
        />,
      );

      await act(async () => {
        // Wait for component to render
      });

      const image = UNSAFE_getByType(Image);
      expect(image).toBeDefined();
      expect(image.props.source.uri).toBe('https://example.com/token.png');
    });
  });
});
