import React from 'react';
import { shallow } from 'enzyme';
import RemoteImage, { useSVGViewBox } from './';
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation(() => 'https://cloudflare-ipfs.com/ipfs/'),
}));

jest.mock('../../../components/hooks/useIpfsGateway', () => jest.fn());

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

  it('should render ipfs sources', () => {
    const wrapper = shallow(
      <RemoteImage
        source={{
          uri: 'ipfs://QmeE94srcYV9WwJb1p42eM4zncdLUai2N9zmMxxukoEQ23',
        }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('useSVGViewBox()', () => {
  const MOCK_SVG_WITH_VIEWBOX = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60" fill="none"></svg>`;
  const MOCK_SVG_WITHOUT_VIEWBOX = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="none"></svg>`;

  function arrangeMocks() {
    const mockResponseTextFn = jest
      .fn()
      .mockResolvedValue(MOCK_SVG_WITHOUT_VIEWBOX);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ text: mockResponseTextFn } as unknown as Response);

    return { mockText: mockResponseTextFn };
  }

  it('should return view-box if svg if missing a view-box', async () => {
    const { mockText } = arrangeMocks();
    mockText.mockResolvedValueOnce(MOCK_SVG_WITHOUT_VIEWBOX);

    const hook = renderHook(() => useSVGViewBox('URI', true));
    await waitFor(() => expect(hook.result.current).toBeDefined());
  });

  it('should not return a view-box if svg already has view-box', async () => {
    const { mockText } = arrangeMocks();
    mockText.mockResolvedValueOnce(MOCK_SVG_WITH_VIEWBOX);

    const hook = renderHook(() => useSVGViewBox('URI', true));
    await waitFor(() => expect(hook.result.current).toBeUndefined());
  });

  it('should not make async calls if image is not an svg', async () => {
    const mocks = arrangeMocks();
    const hook = renderHook(() => useSVGViewBox('URI', false));

    await waitFor(() => expect(hook.result.current).toBeUndefined());
    expect(mocks.mockText).not.toHaveBeenCalled();
  });
});
