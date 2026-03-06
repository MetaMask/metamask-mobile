import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PriceImpactHeader } from './PriceImpactHeader';
import { PriceImpactModalType } from './constants';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

// Render the warning Icon with a testID derived from the icon name so it can
// be queried in tests without coupling to SVG internals.
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name: string; testID?: string }) => (
      <View testID={testID ?? `icon-${name}`} />
    ),
    IconName: jest.requireActual(
      '../../../../../component-library/components/Icons/Icon',
    ).IconName,
    IconSize: jest.requireActual(
      '../../../../../component-library/components/Icons/Icon',
    ).IconSize,
  };
});

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PriceImpactHeader', () => {
  describe('title', () => {
    it('renders "Price impact" for the Info type', () => {
      const { getByText } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Info}
          onClose={onClose}
        />,
      );

      expect(getByText(strings('bridge.price_impact'))).toBeTruthy();
    });

    it('renders "High price impact" for the Execution type', () => {
      const { getByText } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Execution}
          onClose={onClose}
        />,
      );

      expect(getByText(strings('bridge.price_impact_high'))).toBeTruthy();
    });
  });

  describe('close button', () => {
    it('renders the close button', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Info}
          onClose={onClose}
        />,
      );

      expect(getByTestId('button-icon')).toBeTruthy();
    });

    it('calls onClose when the close button is pressed', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Info}
          onClose={onClose}
        />,
      );

      fireEvent.press(getByTestId('button-icon'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on the Execution type as well', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Execution}
          onClose={onClose}
          warningIconName={IconName.Danger}
          warningIconColor="red"
        />,
      );

      fireEvent.press(getByTestId('button-icon'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('warning icon', () => {
    it('renders the warning icon when both warningIconName and warningIconColor are provided', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Execution}
          onClose={onClose}
          warningIconName={IconName.Danger}
          warningIconColor="red"
        />,
      );

      expect(getByTestId(`icon-${IconName.Danger}`)).toBeTruthy();
    });

    it('does not render the warning icon when warningIconName is absent', () => {
      const { queryByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Execution}
          onClose={onClose}
          warningIconColor="red"
        />,
      );

      expect(queryByTestId(`icon-${IconName.Danger}`)).toBeNull();
    });

    it('does not render the warning icon when warningIconColor is absent', () => {
      const { queryByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Info}
          onClose={onClose}
          warningIconName={IconName.Warning}
        />,
      );

      expect(queryByTestId(`icon-${IconName.Warning}`)).toBeNull();
    });

    it('does not render the warning icon when neither prop is provided', () => {
      const { queryByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Info}
          onClose={onClose}
        />,
      );

      expect(queryByTestId(`icon-${IconName.Danger}`)).toBeNull();
      expect(queryByTestId(`icon-${IconName.Warning}`)).toBeNull();
    });

    it('renders a Warning icon for the Info type when both props are provided', () => {
      const { getByTestId } = render(
        <PriceImpactHeader
          type={PriceImpactModalType.Info}
          onClose={onClose}
          warningIconName={IconName.Warning}
          warningIconColor="orange"
        />,
      );

      expect(getByTestId(`icon-${IconName.Warning}`)).toBeTruthy();
    });
  });
});
