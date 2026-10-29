// Third party dependencies.
import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { typography } from '@metamask/design-tokens';

// Internal dependencies.
import TitleStandardMarketing from './TitleStandardMarketing';

const TEST_IDS = {
  CONTAINER: 'title-standard-marketing-container',
  TITLE: 'title-standard-marketing-title',
  TITLE_WRAPPER: 'title-standard-marketing-title-wrapper',
  BOTTOM_LABEL: 'title-standard-marketing-bottom-label',
  BOTTOM_LABEL_WRAPPER: 'title-standard-marketing-bottom-label-wrapper',
};

describe('TitleStandardMarketing', () => {
  describe('title', () => {
    it('renders a string title', () => {
      const { getByText } = render(
        <TitleStandardMarketing title="Import a wallet" />,
      );

      expect(getByText('Import a wallet')).toBeOnTheScreen();
    });

    it('renders a ReactNode title', () => {
      const { getByText } = render(
        <TitleStandardMarketing title={<Text>Custom title</Text>} />,
      );

      expect(getByText('Custom title')).toBeOnTheScreen();
    });

    it('applies DisplayLg font size and hero font family to a string title', () => {
      const { result } = renderHook(() => useTailwind());
      const tw = result.current;

      const { getByTestId } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          titleProps={{ testID: TEST_IDS.TITLE }}
        />,
      );

      const title = getByTestId(TEST_IDS.TITLE);
      expect(title).toHaveStyle({
        fontSize: typography.sDisplayLG.fontSize,
      });
      expect(title).toHaveStyle(tw.style('font-hero-bold'));
    });

    it('sets the title line height equal to the DisplayLg font size', () => {
      const { getByTestId } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          titleProps={{ testID: TEST_IDS.TITLE }}
        />,
      );

      expect(getByTestId(TEST_IDS.TITLE)).toHaveStyle({
        lineHeight: typography.sDisplayLG.fontSize,
      });
    });
  });

  describe('bottomLabel', () => {
    it('applies BodyMd font size, medium weight, and alternative color to a string bottom label', () => {
      const { result } = renderHook(() => useTailwind());
      const tw = result.current;

      const { getByTestId } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          bottomLabel="Enter your Secret Recovery Phrase"
          bottomLabelProps={{ testID: TEST_IDS.BOTTOM_LABEL }}
        />,
      );

      const bottomLabel = getByTestId(TEST_IDS.BOTTOM_LABEL);
      expect(bottomLabel).toHaveStyle(tw`text-body-md`);
      expect(bottomLabel).toHaveStyle(tw.style('font-default-medium'));
      expect(bottomLabel).toHaveStyle(tw`text-alternative`);
    });
  });

  describe('testID passthrough', () => {
    it('passes testIDs through titleProps, titleWrapperProps, bottomLabelProps, and bottomLabelWrapperProps', () => {
      const { getByTestId } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          titleProps={{ testID: TEST_IDS.TITLE }}
          titleWrapperProps={{ testID: TEST_IDS.TITLE_WRAPPER }}
          bottomLabel="Enter your Secret Recovery Phrase"
          bottomLabelProps={{ testID: TEST_IDS.BOTTOM_LABEL }}
          bottomLabelWrapperProps={{ testID: TEST_IDS.BOTTOM_LABEL_WRAPPER }}
        />,
      );

      expect(getByTestId(TEST_IDS.TITLE)).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.TITLE_WRAPPER)).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.BOTTOM_LABEL)).toBeOnTheScreen();
      expect(getByTestId(TEST_IDS.BOTTOM_LABEL_WRAPPER)).toBeOnTheScreen();
    });
  });

  describe('topAccessory', () => {
    it('renders topAccessory', () => {
      const { getByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          topAccessory={<Text>Top accessory</Text>}
        />,
      );

      expect(getByText('Top accessory')).toBeOnTheScreen();
    });

    it('does not render topAccessory when false', () => {
      const { queryByText } = render(
        <TitleStandardMarketing title="Import a wallet" topAccessory={false} />,
      );

      expect(queryByText('false')).not.toBeOnTheScreen();
    });
  });

  describe('titleEndAccessory', () => {
    it('renders titleEndAccessory', () => {
      const { getByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          titleEndAccessory={<Text>Title end</Text>}
        />,
      );

      expect(getByText('Import a wallet')).toBeOnTheScreen();
      expect(getByText('Title end')).toBeOnTheScreen();
    });

    it('does not render titleEndAccessory when false', () => {
      const { queryByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          titleEndAccessory={false}
        />,
      );

      expect(queryByText('false')).not.toBeOnTheScreen();
    });
  });

  describe('bottomLabelEndAccessory', () => {
    it('renders bottomLabelEndAccessory with bottomLabel', () => {
      const { getByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          bottomLabel="Enter your Secret Recovery Phrase"
          bottomLabelEndAccessory={<Text>Bottom end</Text>}
        />,
      );

      expect(getByText('Enter your Secret Recovery Phrase')).toBeOnTheScreen();
      expect(getByText('Bottom end')).toBeOnTheScreen();
    });

    it('does not render bottomLabelEndAccessory without bottomLabel', () => {
      const { queryByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          bottomLabelEndAccessory={<Text>Bottom end</Text>}
        />,
      );

      expect(queryByText('Bottom end')).not.toBeOnTheScreen();
    });
  });

  describe('bottomAccessory', () => {
    it('renders bottomAccessory when bottomLabel is missing', () => {
      const { getByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          bottomAccessory={<Text>Bottom accessory</Text>}
        />,
      );

      expect(getByText('Bottom accessory')).toBeOnTheScreen();
    });

    it('renders bottomAccessory when bottomLabel is false', () => {
      const { getByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          bottomLabel={false}
          bottomAccessory={<Text>Bottom accessory</Text>}
        />,
      );

      expect(getByText('Bottom accessory')).toBeOnTheScreen();
    });

    it('renders only bottomLabel when both bottomLabel and bottomAccessory are provided', () => {
      const { getByText, queryByText } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          bottomLabel="Enter your Secret Recovery Phrase"
          bottomAccessory={<Text>Bottom accessory</Text>}
        />,
      );

      expect(getByText('Enter your Secret Recovery Phrase')).toBeOnTheScreen();
      expect(queryByText('Bottom accessory')).not.toBeOnTheScreen();
    });
  });

  describe('root container', () => {
    it('applies style and twClassName to the root with gap-2 and mb-6', () => {
      const { result } = renderHook(() => useTailwind());
      const tw = result.current;
      const customStyle = { opacity: 0.5 };

      const { getByTestId } = render(
        <TitleStandardMarketing
          title="Import a wallet"
          testID={TEST_IDS.CONTAINER}
          twClassName="mt-4"
          style={customStyle}
        />,
      );

      const container = getByTestId(TEST_IDS.CONTAINER);
      expect(container).toHaveStyle(customStyle);
      expect(container).toHaveStyle(tw`mt-4`);
      expect(container).toHaveStyle(tw`gap-2`);
      expect(container).toHaveStyle(tw`mb-6`);
    });
  });
});
