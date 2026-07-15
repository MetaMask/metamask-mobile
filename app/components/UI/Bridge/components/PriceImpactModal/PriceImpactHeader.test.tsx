import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PriceImpactHeader } from './PriceImpactHeader';
import { strings } from '../../../../../../locales/i18n';
import { IconColor, IconName } from '@metamask/design-system-react-native';

// Render the warning Icon with a testID derived from the icon name so it can
// be queried in tests without coupling to SVG internals.
// Only Icon is overridden; all other design-system exports (ButtonIcon, etc.)
// are preserved from the real module so their existing behaviour is unchanged.
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Icon: ({ name, testID }: { name: string; testID?: string }) => (
      <View testID={testID ?? `icon-${name}`} />
    ),
  };
});

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PriceImpactHeader', () => {
  describe('content rendering', () => {
    it('renders the localized string for price_impact_info_title', () => {
      const { getByText } = render(
        <PriceImpactHeader
          content="bridge.price_impact_info_title"
          onClose={onClose}
        />,
      );

      expect(getByText(strings('bridge.price_impact_info_title'))).toBeTruthy();
    });

    it('renders the localized string for price_impact_warning_title', () => {
      const { getByText } = render(
        <PriceImpactHeader
          content="bridge.price_impact_warning_title"
          onClose={onClose}
        />,
      );

      expect(
        getByText(strings('bridge.price_impact_warning_title')),
      ).toBeTruthy();
    });

    it('renders the localized string for price_impact_error_title', () => {
      const { getByText } = render(
        <PriceImpactHeader
          content="bridge.price_impact_error_title"
          onClose={onClose}
        />,
      );

      expect(
        getByText(strings('bridge.price_impact_error_title')),
      ).toBeTruthy();
    });
  });

  describe('close button', () => {
    it('renders the close button', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_info_title"
          onClose={onClose}
        />,
      );

      expect(getByTestId('button-icon')).toBeTruthy();
    });

    it('calls onClose when the close button is pressed', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_info_title"
          onClose={onClose}
        />,
      );

      fireEvent.press(getByTestId('button-icon'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when an icon is also shown', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_error_title"
          onClose={onClose}
          iconName={IconName.Danger}
          iconColor={IconColor.ErrorDefault}
        />,
      );

      fireEvent.press(getByTestId('button-icon'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning icon', () => {
    it('renders the warning icon when both iconName and iconColor are provided', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_error_title"
          onClose={onClose}
          iconName={IconName.Danger}
          iconColor={IconColor.ErrorDefault}
        />,
      );

      expect(getByTestId(`icon-${IconName.Danger}`)).toBeTruthy();
    });

    it('does not render the warning icon when iconName is absent', () => {
      const { queryByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_error_title"
          onClose={onClose}
          iconColor={IconColor.ErrorDefault}
        />,
      );

      expect(queryByTestId(`icon-${IconName.Danger}`)).toBeNull();
    });

    it('does not render the warning icon when iconColor is absent', () => {
      const { queryByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_info_title"
          onClose={onClose}
          iconName={IconName.Warning}
        />,
      );

      expect(queryByTestId(`icon-${IconName.Warning}`)).toBeNull();
    });

    it('does not render the warning icon when neither prop is provided', () => {
      const { queryByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_info_title"
          onClose={onClose}
        />,
      );

      expect(queryByTestId(`icon-${IconName.Danger}`)).toBeNull();
      expect(queryByTestId(`icon-${IconName.Warning}`)).toBeNull();
    });

    it('renders a Warning icon when iconName and iconColor are both provided', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          content="bridge.price_impact_warning_title"
          onClose={onClose}
          iconName={IconName.Warning}
          iconColor={IconColor.WarningDefault}
        />,
      );

      expect(getByTestId(`icon-${IconName.Warning}`)).toBeTruthy();
    });
  });
});
