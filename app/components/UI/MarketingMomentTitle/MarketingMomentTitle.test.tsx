import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import I18n, { I18nEvents } from '../../../../locales/i18n';
import MarketingMomentTitle from './MarketingMomentTitle';

jest.mock('../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
  I18nEvents: new (jest.requireActual('events').EventEmitter)(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, props, children),
    FontFamily: { Hero: 'hero', Default: 'default' },
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

describe('MarketingMomentTitle', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    I18n.locale = 'en';
    I18nEvents.removeAllListeners();
    Platform.OS = 'ios';
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('renders a Grotzec title for a supported language', () => {
    const { getByRole } = render(
      <MarketingMomentTitle>Perps are here</MarketingMomentTitle>,
    );

    const title = getByRole('header');
    expect(title).toHaveTextContent('Perps are here');
    expect(title.props.variant).toBe('display-xl');
    expect(title.props.fontFamily).toBe('hero');
    expect(title.props.twClassName).toBeUndefined();
    expect(title.props.style).toEqual([
      expect.objectContaining({
        lineHeight: 48,
        letterSpacing: -1.2,
        marginBottom: -12,
        paddingTop: 12,
        paddingBottom: 12,
      }),
    ]);
  });

  it('switches to the system face at DisplayLg for an unsupported language', () => {
    I18n.locale = 'ja';

    const { getByRole } = render(
      <MarketingMomentTitle>パープスが登場</MarketingMomentTitle>,
    );

    const title = getByRole('header');
    expect(title.props.variant).toBe('display-lg');
    expect(title.props.fontFamily).toBe('default');
    expect(title.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontFamily: 'System',
          fontWeight: '700',
        }),
      ]),
    );
  });

  it('updates when the app language changes', () => {
    const { getByRole } = render(
      <MarketingMomentTitle>Perps are here</MarketingMomentTitle>,
    );

    act(() => {
      I18n.locale = 'ko';
      I18nEvents.emit('localeChanged', 'ko');
    });

    expect(getByRole('header').props.variant).toBe('display-lg');
  });

  it('appends caller classes and keeps caller style after the treatment', () => {
    const callerStyle = { opacity: 0.5 };
    const { getByTestId } = render(
      <MarketingMomentTitle
        testID="marketing-title"
        twClassName="text-accent02-light"
        style={callerStyle}
      >
        Spend and earn
      </MarketingMomentTitle>,
    );

    const title = getByTestId('marketing-title');
    expect(title.props.twClassName).toBe('text-accent02-light');
    expect(title.props.style).toEqual([
      expect.objectContaining({
        lineHeight: 48,
        letterSpacing: -1.2,
      }),
      callerStyle,
    ]);
  });
});
