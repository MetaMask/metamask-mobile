// Third party dependencies.
import React, { useMemo } from 'react';

// External dependencies.
import {
  Text,
  TextVariant,
  FontWeight,
  IconName,
  ButtonIconProps,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import HeaderBase from '../HeaderBase';
import { HeaderCenterProps } from './HeaderCenter.types';
import { HeaderCenterTestIds } from './HeaderCenter.constants';

/**
 * HeaderCenter is a header component with centered title and optional close button.
 * Extends HeaderBase with convenient props for common header patterns.
 *
 * @example
 * ```tsx
 * <HeaderCenter
 *   title="Page Title"
 *   onClose={handleClose}
 * />
 *
 * // Or with custom close button props
 * <HeaderCenter
 *   title="Page Title"
 *   closeButtonProps={{ onPress: handleClose, isDisabled: true }}
 * />
 * ```
 */
const HeaderCenter: React.FC<HeaderCenterProps> = ({
  title,
  children,
  onClose,
  closeButtonProps,
  endButtonIconProps,
  testID = HeaderCenterTestIds.CONTAINER,
  ...headerBaseProps
}) => {
  // Build the endButtonIconProps array with close button if needed
  const resolvedEndButtonIconProps = useMemo(() => {
    const props: ButtonIconProps[] = [];

    // Add close button if onClose or closeButtonProps is provided
    if (onClose || closeButtonProps) {
      const closeProps: ButtonIconProps = {
        iconName: IconName.Close,
        testID: HeaderCenterTestIds.CLOSE_BUTTON,
        ...(closeButtonProps || {}),
        onPress: closeButtonProps?.onPress ?? onClose,
      };
      props.push(closeProps);
    }

    // Add existing endButtonIconProps last
    if (endButtonIconProps) {
      props.push(...endButtonIconProps);
    }
    return props.length > 0 ? props : undefined;
  }, [endButtonIconProps, onClose, closeButtonProps]);

  // Render title if children is not provided
  const renderContent = () => {
    if (children) {
      return children;
    }
    if (title) {
      return (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          testID={HeaderCenterTestIds.TITLE}
        >
          {title}
        </Text>
      );
    }
    return null;
  };

  return (
    <HeaderBase
      testID={testID}
      endButtonIconProps={resolvedEndButtonIconProps}
      {...headerBaseProps}
    >
      {renderContent()}
    </HeaderBase>
  );
};

export default HeaderCenter;
