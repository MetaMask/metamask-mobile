import React from 'react';
import useIsOriginalNativeTokenSymbol from '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { TokenI } from '../../types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ScamWarningIcon } from '.';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

// Mock dependencies
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => ({ type: 'abc' }),
}));

jest.mock(
  '../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

describe('ScamWarningIcon', () => {
  const mockSetShowScamWarningModal = jest.fn();

  it('renders the icon if the asset is not the original native token', () => {
    (useIsOriginalNativeTokenSymbol as jest.Mock).mockReturnValue(false);

    const asset = {
      chainId: '0x1',
      isETH: true,
    } as unknown as TokenI & { chainId: string };

    const { UNSAFE_getByType } = renderWithProvider(
      <ScamWarningIcon
        asset={asset}
        setShowScamWarningModal={mockSetShowScamWarningModal}
      />,
    );

    const icon = UNSAFE_getByType(ButtonIcon);

    expect(icon.props.iconName).toStrictEqual(IconName.Danger);
  });

  it('renders null if the asset is the original native token', () => {
    (useIsOriginalNativeTokenSymbol as jest.Mock).mockReturnValue(true);

    const asset = {
      chainId: '0x1',
      isETH: true,
    } as unknown as TokenI & { chainId: string };

    const { toJSON } = renderWithProvider(
      <ScamWarningIcon
        asset={asset}
        setShowScamWarningModal={mockSetShowScamWarningModal}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders null if the asset is not ETH', () => {
    (useIsOriginalNativeTokenSymbol as jest.Mock).mockReturnValue(true);

    const asset = {
      chainId: '0x1',
      isETH: false,
    } as unknown as TokenI & { chainId: string };

    const { toJSON } = renderWithProvider(
      <ScamWarningIcon
        asset={asset}
        setShowScamWarningModal={mockSetShowScamWarningModal}
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
