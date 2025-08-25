import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsTokenLogo from './PerpsTokenLogo';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => `Avatar-${name}`,
  AvatarSize: {
    Md: 'Md',
    Lg: 'Lg',
  },
  AvatarVariant: {
    Token: 'Token',
  },
}));

jest.mock('react-native-svg', () => ({
  SvgXml: ({ xml }: { xml: string }) =>
    `SvgXml-${xml ? xml.substring(0, 30) : ''}`,
}));

describe('PerpsTokenLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const { getByTestId } = render(
      <PerpsTokenLogo symbol="BTC" testID="token-logo" />,
    );
    expect(getByTestId('token-logo')).toBeTruthy();
  });

  it('applies custom size and style props', () => {
    const customStyle = { opacity: 0.5 };
    const { getByTestId } = render(
      <PerpsTokenLogo
        symbol="BTC"
        size={40}
        style={customStyle}
        testID="custom-logo"
      />,
    );

    const container = getByTestId('custom-logo');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 40,
          height: 40,
          borderRadius: 20,
        }),
        customStyle,
      ]),
    );
  });

  it('renders with default size when not specified', () => {
    const { getByTestId } = render(
      <PerpsTokenLogo symbol="ETH" testID="default-size" />,
    );

    const container = getByTestId('default-size');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 32,
          height: 32,
          borderRadius: 16,
        }),
      ]),
    );
  });
});
