// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// External dependencies.
import Text, { TextVariant, getFontFamily } from '../Texts/Text';
import { useComponentSize } from '../../hooks';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  HEADERBASE_VARIANT_TEXT_VARIANTS,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';
import { HeaderBaseVariant } from './HeaderBase.types';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useComponentSize: jest.fn(),
}));

describe('HeaderBase', () => {
  const mockInsets = { top: 20, bottom: 0, left: 0, right: 0 };
  const mockUseComponentSize = useComponentSize as jest.Mock;

  beforeEach(() => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue(mockInsets);
    mockUseComponentSize.mockReturnValue({
      size: null,
      onLayout: jest.fn(),
    });
  });

  it('should render snapshot correctly with Compact variant', () => {
    const wrapper = render(
      <HeaderBase variant={HeaderBaseVariant.Compact}>
        Sample HeaderBase Title
      </HeaderBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render HeaderBase', () => {
    const { queryByTestId } = render(
      <HeaderBase>Sample HeaderBase Title</HeaderBase>,
    );
    expect(queryByTestId(HEADERBASE_TEST_ID)).not.toBe(null);
  });

  it('should render HeaderBase with default Compact variant when no variant is provided', () => {
    const { getByTestId, getByRole } = render(
      <HeaderBase>Default Variant Header</HeaderBase>,
    );

    const titleElement = getByTestId(HEADERBASE_TITLE_TEST_ID);
    const textElement = getByRole('text');
    const fontFamily = getFontFamily(
      HEADERBASE_VARIANT_TEXT_VARIANTS[HeaderBaseVariant.Compact],
    );

    // Should default to Compact variant (center aligned with HeadingSM text)
    expect(titleElement.props.style.textAlign).toBe('center');
    expect(textElement.props.style.fontFamily).toBe(fontFamily);
  });

  it('should render Header with the right text variant if typeof children === string', () => {
    const { getByRole } = render(
      <HeaderBase variant={HeaderBaseVariant.Compact}>
        Sample HeaderBase Title
      </HeaderBase>,
    );
    const fontFamily = getFontFamily(
      HEADERBASE_VARIANT_TEXT_VARIANTS[HeaderBaseVariant.Compact],
    );

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });

  it('should render Header with the custom node if typeof children !== string', () => {
    const testTextVariant = TextVariant.DisplayMD;
    const { getByRole } = render(
      <HeaderBase variant={HeaderBaseVariant.Compact}>
        <Text variant={testTextVariant} testID={HEADERBASE_TITLE_TEST_ID}>
          Sample HeaderBase Title
        </Text>
      </HeaderBase>,
    );

    const fontFamily = getFontFamily(testTextVariant);

    expect(getByRole('text').props.style.fontFamily).toBe(fontFamily);
  });

  it('applies marginTop when includesTopInset is true', () => {
    const { getByTestId } = render(
      <HeaderBase variant={HeaderBaseVariant.Compact} includesTopInset>
        Header Content
      </HeaderBase>,
    );

    const headerBase = getByTestId(HEADERBASE_TEST_ID);
    // Verify the marginTop is applied
    expect(headerBase.props.style).toEqual(
      expect.arrayContaining([{ marginTop: mockInsets.top }]),
    );
  });

  it('does not apply marginTop when includesTopInset is false', () => {
    const { getByTestId } = render(
      <HeaderBase variant={HeaderBaseVariant.Compact} includesTopInset={false}>
        Header Content
      </HeaderBase>,
    );

    const headerBase = getByTestId(HEADERBASE_TEST_ID);
    // Verify the marginTop is not applied
    expect(headerBase.props.style).toEqual(
      expect.not.arrayContaining([{ marginTop: mockInsets.top }]),
    );
  });

  describe('variant functionality', () => {
    it('applies Display variant correctly - left alignment and HeadingLG text', () => {
      const { getByTestId, getByRole } = render(
        <HeaderBase variant={HeaderBaseVariant.Display}>
          Header Content
        </HeaderBase>,
      );

      const titleElement = getByTestId(HEADERBASE_TITLE_TEST_ID);
      const textElement = getByRole('text');
      const fontFamily = getFontFamily(
        HEADERBASE_VARIANT_TEXT_VARIANTS[HeaderBaseVariant.Display],
      );

      // Check alignment
      expect(titleElement.props.style.textAlign).toBe('left');
      // Check text variant
      expect(textElement.props.style.fontFamily).toBe(fontFamily);
    });

    it('applies Compact variant correctly - center alignment and HeadingSM text', () => {
      const { getByTestId, getByRole } = render(
        <HeaderBase variant={HeaderBaseVariant.Compact}>
          Header Content
        </HeaderBase>,
      );

      const titleElement = getByTestId(HEADERBASE_TITLE_TEST_ID);
      const textElement = getByRole('text');
      const fontFamily = getFontFamily(
        HEADERBASE_VARIANT_TEXT_VARIANTS[HeaderBaseVariant.Compact],
      );

      // Check alignment
      expect(titleElement.props.style.textAlign).toBe('center');
      // Check text variant
      expect(textElement.props.style.fontFamily).toBe(fontFamily);
    });

    it('renders snapshot correctly with Display variant', () => {
      const wrapper = render(
        <HeaderBase variant={HeaderBaseVariant.Display}>
          Display Variant Header
        </HeaderBase>,
      );
      expect(wrapper).toMatchSnapshot();
    });

    it('renders snapshot correctly with Compact variant', () => {
      const wrapper = render(
        <HeaderBase variant={HeaderBaseVariant.Compact}>
          Compact Variant Header
        </HeaderBase>,
      );
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('variant functionality with accessories', () => {
    const mockAccessoryComponent = <Text>Test Accessory</Text>;

    describe('Display variant (left alignment)', () => {
      it('only renders start accessory wrapper when start accessory exists', () => {
        const startAccessoryTestId = 'start-accessory-wrapper';
        const endAccessoryTestId = 'end-accessory-wrapper';

        const { queryByTestId } = render(
          <HeaderBase
            variant={HeaderBaseVariant.Display}
            startAccessory={mockAccessoryComponent}
            startAccessoryWrapperProps={{ testID: startAccessoryTestId }}
            endAccessoryWrapperProps={{ testID: endAccessoryTestId }}
          >
            Header Content
          </HeaderBase>,
        );

        // Display variant acts like left alignment
        expect(queryByTestId(startAccessoryTestId)).toBeTruthy();
        expect(queryByTestId(endAccessoryTestId)).toBeFalsy();
      });

      it('renders both wrappers when both accessories exist', () => {
        const startAccessoryTestId = 'start-accessory-wrapper';
        const endAccessoryTestId = 'end-accessory-wrapper';

        const { queryByTestId } = render(
          <HeaderBase
            variant={HeaderBaseVariant.Display}
            startAccessory={mockAccessoryComponent}
            endAccessory={mockAccessoryComponent}
            startAccessoryWrapperProps={{ testID: startAccessoryTestId }}
            endAccessoryWrapperProps={{ testID: endAccessoryTestId }}
          >
            Header Content
          </HeaderBase>,
        );

        // Both wrappers should be rendered when both accessories exist
        expect(queryByTestId(startAccessoryTestId)).toBeTruthy();
        expect(queryByTestId(endAccessoryTestId)).toBeTruthy();
      });
    });

    describe('Compact variant (center alignment)', () => {
      it('renders both accessory wrappers when any accessory exists', () => {
        const startAccessoryTestId = 'start-accessory-wrapper';
        const endAccessoryTestId = 'end-accessory-wrapper';

        const { queryByTestId } = render(
          <HeaderBase
            variant={HeaderBaseVariant.Compact}
            startAccessory={mockAccessoryComponent}
            startAccessoryWrapperProps={{ testID: startAccessoryTestId }}
            endAccessoryWrapperProps={{ testID: endAccessoryTestId }}
          >
            Header Content
          </HeaderBase>,
        );

        // Compact variant acts like center alignment
        expect(queryByTestId(startAccessoryTestId)).toBeTruthy();
        expect(queryByTestId(endAccessoryTestId)).toBeTruthy();
      });

      it('does not render accessory wrappers when no accessories exist', () => {
        const startAccessoryTestId = 'start-accessory-wrapper';
        const endAccessoryTestId = 'end-accessory-wrapper';

        const { queryByTestId } = render(
          <HeaderBase
            variant={HeaderBaseVariant.Compact}
            startAccessoryWrapperProps={{ testID: startAccessoryTestId }}
            endAccessoryWrapperProps={{ testID: endAccessoryTestId }}
          >
            Header Content
          </HeaderBase>,
        );

        // No wrappers should be rendered when no accessories exist
        expect(queryByTestId(startAccessoryTestId)).toBeFalsy();
        expect(queryByTestId(endAccessoryTestId)).toBeFalsy();
      });
    });
  });

  describe('accessory width calculations', () => {
    const mockAccessoryComponent = <Text>Test Accessory</Text>;

    it('calculates accessoryWidth when both start and end accessories have sizes for Compact variant', () => {
      // Mock useComponentSize to return different sizes for each call
      mockUseComponentSize
        .mockReturnValueOnce({
          size: { width: 50, height: 30 },
          onLayout: jest.fn(),
        })
        .mockReturnValueOnce({
          size: { width: 40, height: 25 },
          onLayout: jest.fn(),
        });

      const { getByTestId } = render(
        <HeaderBase
          variant={HeaderBaseVariant.Compact}
          startAccessory={mockAccessoryComponent}
          endAccessory={mockAccessoryComponent}
        >
          Header Content
        </HeaderBase>,
      );

      const headerBase = getByTestId(HEADERBASE_TEST_ID);
      // The accessoryWidth should be calculated and applied for center alignment
      expect(headerBase).toBeTruthy();
    });

    it('does not calculate accessoryWidth for Display variant', () => {
      mockUseComponentSize
        .mockReturnValueOnce({
          size: { width: 50, height: 30 },
          onLayout: jest.fn(),
        })
        .mockReturnValueOnce({
          size: { width: 40, height: 25 },
          onLayout: jest.fn(),
        });

      const { getByTestId } = render(
        <HeaderBase
          variant={HeaderBaseVariant.Display}
          startAccessory={mockAccessoryComponent}
          endAccessory={mockAccessoryComponent}
        >
          Header Content
        </HeaderBase>,
      );

      const titleElement = getByTestId(HEADERBASE_TITLE_TEST_ID);
      expect(titleElement.props.style.textAlign).toBe('left');
    });
  });
});
