// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { Text, IconName } from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';
import { HeaderBaseVariant } from './HeaderBase.types';

const START_ACCESSORY_TEST_ID = 'start-accessory-wrapper';
const END_ACCESSORY_TEST_ID = 'end-accessory-wrapper';
const BUTTON_ICON_TEST_ID = 'button-icon';
const CUSTOM_CONTENT_TEST_ID = 'custom-content';
const START_CONTENT_TEST_ID = 'start-content';
const END_CONTENT_TEST_ID = 'end-content';

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
      const { getByTestId } = render(
        <HeaderBase>
          <Text testID={CUSTOM_CONTENT_TEST_ID}>Custom Content</Text>
        </HeaderBase>,
      );

      expect(getByTestId(CUSTOM_CONTENT_TEST_ID)).toBeOnTheScreen();
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
      const { getByTestId } = render(
        <HeaderBase
          startAccessory={<Text testID={START_CONTENT_TEST_ID}>Start</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(START_CONTENT_TEST_ID)).toBeOnTheScreen();
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
          startAccessory={<Text testID={START_CONTENT_TEST_ID}>Start</Text>}
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
      const { getByTestId } = render(
        <HeaderBase
          endAccessory={<Text testID={END_CONTENT_TEST_ID}>End</Text>}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(END_CONTENT_TEST_ID)).toBeOnTheScreen();
    });

    it('does not render end accessory wrapper when endAccessory is not provided', () => {
      const { queryByTestId } = render(
        <HeaderBase
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(queryByTestId(END_ACCESSORY_TEST_ID)).toBeNull();
    });

    it('passes endAccessoryWrapperProps to end accessory wrapper', () => {
      const { getByTestId } = render(
        <HeaderBase
          endAccessory={<Text testID={END_CONTENT_TEST_ID}>End</Text>}
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
      const { getByTestId, queryByTestId } = render(
        <HeaderBase
          startAccessory={
            <Text testID={START_CONTENT_TEST_ID}>Custom Start</Text>
          }
          startButtonIconProps={{
            iconName: IconName.ArrowLeft,
            onPress: jest.fn(),
          }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_CONTENT_TEST_ID)).toBeOnTheScreen();
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
      const { getByTestId, queryByTestId } = render(
        <HeaderBase
          endAccessory={<Text testID={END_CONTENT_TEST_ID}>Custom End</Text>}
          endButtonIconProps={[
            { iconName: IconName.Close, onPress: jest.fn() },
          ]}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(END_CONTENT_TEST_ID)).toBeOnTheScreen();
      expect(queryByTestId(BUTTON_ICON_TEST_ID)).toBeNull();
    });
  });

  describe('accessory wrapper rendering for centering', () => {
    it('renders both accessory wrappers in Compact variant when only start accessory is provided', () => {
      const { getByTestId } = render(
        <HeaderBase
          startAccessory={<Text testID={START_CONTENT_TEST_ID}>Start</Text>}
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
          endAccessory={<Text testID={END_CONTENT_TEST_ID}>End</Text>}
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
          startAccessory={<Text testID={START_CONTENT_TEST_ID}>Start</Text>}
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
          endAccessory={<Text testID={END_CONTENT_TEST_ID}>End</Text>}
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
      const { getByTestId } = render(
        <HeaderBase
          startAccessory={<Text testID={START_CONTENT_TEST_ID}>Start</Text>}
          endAccessory={<Text testID={END_CONTENT_TEST_ID}>End</Text>}
          startAccessoryWrapperProps={{ testID: START_ACCESSORY_TEST_ID }}
          endAccessoryWrapperProps={{ testID: END_ACCESSORY_TEST_ID }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(START_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(END_ACCESSORY_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(START_CONTENT_TEST_ID)).toBeOnTheScreen();
      expect(getByTestId(END_CONTENT_TEST_ID)).toBeOnTheScreen();
    });
  });
});
