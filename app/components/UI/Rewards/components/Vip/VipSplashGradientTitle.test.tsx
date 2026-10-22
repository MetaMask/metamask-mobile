import React from 'react';
import { render } from '@testing-library/react-native';
import VipSplashGradientTitle from './VipSplashGradientTitle';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      twClassName?: string;
    }) => ReactActual.createElement(Text, props, children),
    FontFamily: { Hero: 'hero', Default: 'default' },
    FontWeight: { Regular: 'regular' },
    TextVariant: {
      DisplayXl: 'display-xl',
      DisplayLg: 'display-lg',
      DisplayMd: 'display-md',
      HeadingLg: 'heading-lg',
      HeadingMd: 'heading-md',
      HeadingSm: 'heading-sm',
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
  I18nEvents: new (jest.requireActual('events').EventEmitter)(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
}));

jest.mock('react-native-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockLinearGradient({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return ReactActual.createElement(View, null, children);
  };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockMaskedView({
    children,
    maskElement,
  }: {
    children?: React.ReactNode;
    maskElement?: React.ReactNode;
  }) {
    return ReactActual.createElement(View, null, maskElement, children);
  };
});

describe('VipSplashGradientTitle', () => {
  it('renders the title as the mask and hides the copy that sizes the gradient', () => {
    const { getByTestId, getAllByText } = render(
      <VipSplashGradientTitle
        title="Welcome to Gold Fox Collective"
        testID="vip-splash-title"
      />,
    );

    const mask = getByTestId('vip-splash-title');
    expect(mask).toHaveTextContent('Welcome to Gold Fox Collective');
    expect(mask.props.accessibilityRole).toBe('header');
    expect(mask.props.variant).toBe('display-xl');
    expect(mask.props.fontFamily).toBe('hero');

    const sizingCopy = getAllByText('Welcome to Gold Fox Collective', {
      includeHiddenElements: true,
    }).find((node) => node.props.testID !== 'vip-splash-title');
    expect(sizingCopy?.props.twClassName).toContain('opacity-0');
  });
});
