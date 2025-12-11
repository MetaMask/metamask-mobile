// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';
import { HeaderBaseVariant } from './HeaderBase.types';
import { IconName } from '@metamask/design-system-react-native';

const START_ACCESSORY_TEST_ID = 'start-accessory-wrapper';
const END_ACCESSORY_TEST_ID = 'end-accessory-wrapper';
const BUTTON_ICON_TEST_ID = 'button-icon';

describe('HeaderBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders string title as Text component', () => {
      const { getByText } = render(<HeaderBase>Test Title</HeaderBase>);

      expect(getByText('Test Title')).toBeOnTheScreen();
    });

    it('renders custom children when ReactNode is passed', () => {
      const { getByText } = render(
        <HeaderBase>
          <Text>Custom Content</Text>
        </HeaderBase>,
      );

      expect(getByText('Custom Content')).toBeOnTheScreen();
    });

    it('applies default testID to container', () => {
      const { getByTestId } = render(<HeaderBase>Title</HeaderBase>);

      expect(getByTestId(HEADERBASE_TEST_ID)).toBeOnTheScreen();
    });

    it('applies title testID when string children is passed', () => {
      const { getByTestId } = render(<HeaderBase>Title</HeaderBase>);

      expect(getByTestId(HEADERBASE_TITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('accepts custom testID for container', () => {
      const customTestId = 'custom-header';

      const { getByTestId } = render(
        <HeaderBase testID={customTestId}>Title</HeaderBase>,
      );

      expect(getByTestId(customTestId)).toBeOnTheScreen();
    });
  });

  describe('variant', () => {
    it('uses Compact variant by default', () => {
      const { getByTestId } = render(<HeaderBase>Title</HeaderBase>);

      expect(getByTestId(HEADERBASE_TITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('renders with Display variant when specified', () => {
      const { getByTestId } = render(
        <HeaderBase variant={HeaderBaseVariant.Display}>Title</HeaderBase>,
      );

      expect(getByTestId(HEADERBASE_TITLE_TEST_ID)).toBeOnTheScreen();
    });
  });

  describe('startAccessory', () => {
    it('renders custom start accessory content', () => {
      const { getByTestId, getByText } = render(
        <HeaderBase
          startAccessory={<Text>Start</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByText('Start')).toBeOnTheScreen();
    });

    it('does not render start accessory wrapper when startAccessory is not provided', () => {
      const { queryByTestId } = render(
        <HeaderBase
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(queryByTestId(START_ACCESSORY_TEST_ID)).toBeNull();
    });

    it('passes startAccessoryWrapperProps to start accessory wrapper', () => {
      const { getByTestId } = render(
        <HeaderBase
          startAccessory={<Text>Start</Text>}
          startAccessoryWrapperProps={{ testID: 'custom-start-wrapper' }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId('custom-start-wrapper')).toBeOnTheScreen();
    });
  });

  describe('endAccessory', () => {
    it('renders custom end accessory content', () => {
      const { getByTestId, getByText } = render(
        <HeaderBase
          endAccessory={<Text>End</Text>}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByText('End')).toBeOnTheScreen();
    });

    it('does not render end accessory wrapper when endAccessory is not provided', () => {
      const { queryByTestId } = render(
        <HeaderBase endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}>
          Title
        </HeaderBase>,
      );

      expect(queryByTestId(END_ACCESSORY_TEST_ID)).toBeNull();
    });

    it('passes endAccessoryWrapperProps to end accessory wrapper', () => {
      const { getByTestId } = render(
        <HeaderBase
          endAccessory={<Text>End</Text>}
          endAccessoryWrapperProps={{ testID: 'custom-end-wrapper' }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId('custom-end-wrapper')).toBeOnTheScreen();
    });
  });

  describe('startButtonIconProps', () => {
    it('renders ButtonIcon when startButtonIconProps is provided', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <HeaderBase
          startButtonIconProps={{
            iconName: IconName.ArrowLeft,
            onPress: onPressMock,
          }}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeOnTheScreen();
    });

    it('calls onPress handler when start ButtonIcon is pressed', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <HeaderBase
          startButtonIconProps={{
            iconName: IconName.ArrowLeft,
            onPress: onPressMock,
          }}
        >
          Title
        </HeaderBase>,
      );

      fireEvent.press(getByTestId(BUTTON_ICON_TEST_ID));

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('prioritizes startAccessory over startButtonIconProps', () => {
      const { getByText, queryByTestId } = render(
        <HeaderBase
          startAccessory={<Text>Custom Start</Text>}
          startButtonIconProps={{
            iconName: IconName.ArrowLeft,
            onPress: jest.fn(),
          }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByText('Custom Start')).toBeOnTheScreen();
      expect(queryByTestId(BUTTON_ICON_TEST_ID)).toBeNull();
    });
  });

  describe('endButtonIconProps', () => {
    it('renders single ButtonIcon when one item is provided in array', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <HeaderBase
          endButtonIconProps={[
            {
              iconName: IconName.Close,
              onPress: onPressMock,
            },
          ]}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(BUTTON_ICON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders multiple ButtonIcons when multiple items are provided', () => {
      const { getAllByTestId } = render(
        <HeaderBase
          endButtonIconProps={[
            { iconName: IconName.Search, onPress: jest.fn() },
            { iconName: IconName.Close, onPress: jest.fn() },
          ]}
        >
          Title
        </HeaderBase>,
      );

      expect(getAllByTestId(BUTTON_ICON_TEST_ID)).toHaveLength(2);
    });

    it('does not render ButtonIcons when endButtonIconProps is empty array', () => {
      const { queryByTestId } = render(
        <HeaderBase endButtonIconProps={[]}>Title</HeaderBase>,
      );

      expect(queryByTestId(BUTTON_ICON_TEST_ID)).toBeNull();
    });

    it('prioritizes endAccessory over endButtonIconProps', () => {
      const { getByText, queryByTestId } = render(
        <HeaderBase
          endAccessory={<Text>Custom End</Text>}
          endButtonIconProps={[
            { iconName: IconName.Close, onPress: jest.fn() },
          ]}
        >
          Title
        </HeaderBase>,
      );

      expect(getByText('Custom End')).toBeOnTheScreen();
      expect(queryByTestId(BUTTON_ICON_TEST_ID)).toBeNull();
    });
  });

  describe('accessory wrapper rendering for centering', () => {
    it('renders both accessory wrappers in Compact variant when only start accessory is provided', () => {
      const { getByTestId } = render(
        <HeaderBase
          startAccessory={<Text>Start</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
    });

    it('renders both accessory wrappers in Compact variant when only end accessory is provided', () => {
      const { getByTestId } = render(
        <HeaderBase
          endAccessory={<Text>End</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
    });

    it('renders only start wrapper in Display variant when only start accessory is provided', () => {
      const { getByTestId, queryByTestId } = render(
        <HeaderBase
          variant={HeaderBaseVariant.Display}
          startAccessory={<Text>Start</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(queryByTestId(END_ACCESSORY_TEST_ID)).toBeNull();
    });

    it('renders only end wrapper in Display variant when only end accessory is provided', () => {
      const { queryByTestId, getByTestId } = render(
        <HeaderBase
          variant={HeaderBaseVariant.Display}
          endAccessory={<Text>End</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(queryByTestId(START_ACCESSORY_TEST_ID)).toBeNull();
      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
    });

    it('renders both accessory wrappers when both accessories are provided', () => {
      const { getByTestId, getByText } = render(
        <HeaderBase
          startAccessory={<Text>Start</Text>}
          endAccessory={<Text>End</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByText('Start')).toBeOnTheScreen();
      expect(getByText('End')).toBeOnTheScreen();
    });
  });
});
