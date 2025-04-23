/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef, useEffect } from 'react';
import { Image } from 'react-native';
import JazzIcon from 'react-native-jazzicon';

// External dependencies.
import AvatarBase from '../../foundation/AvatarBase';
import { toDataUrl } from '../../../../../../util/blockies';

// Internal dependencies.
import { AvatarAccountProps, AvatarAccountType } from './AvatarAccount.types';
import stylesheet from './AvatarAccount.styles';
import {
  DEFAULT_AVATARACCOUNT_TYPE,
  DEFAULT_AVATARACCOUNT_SIZE,
} from './AvatarAccount.constants';

// Create a memoized version of the component that logs renders and prop changes
const AvatarAccount = ({
  type = DEFAULT_AVATARACCOUNT_TYPE,
  accountAddress,
  size = DEFAULT_AVATARACCOUNT_SIZE,
  style,
  ...props
}: AvatarAccountProps) => {
  // Track render count with a ref
  const renderCountRef = useRef(0);
  // Track previous props to detect changes
  const prevPropsRef = useRef({ type, accountAddress, size });

  // Increment render count on each render
  renderCountRef.current += 1;

  // Log the render count and which props changed
  useEffect(() => {
    const prevProps = prevPropsRef.current;
    const propsChanged = [];

    if (prevProps.type !== type) {
      propsChanged.push('type');
    }
    if (prevProps.accountAddress !== accountAddress) {
      propsChanged.push('accountAddress');
    }
    if (prevProps.size !== size) {
      propsChanged.push('size');
    }

    // eslint-disable-next-line no-console
    console.log(
      `AvatarAccount rendered ${renderCountRef.current} times.`,
      propsChanged.length > 0
        ? `Props changed: ${propsChanged.join(', ')}`
        : 'No props changed',
      {
        prevAddress: prevProps.accountAddress,
        currentAddress: accountAddress,
        prevType: prevProps.type,
        currentType: type,
        prevSize: prevProps.size,
        currentSize: size,
      },
    );

    // Update the previous props ref
    prevPropsRef.current = { type, accountAddress, size };
  });

  return (
    <AvatarBase size={size} style={style} {...props}>
      {
        {
          [AvatarAccountType.JazzIcon]: (
            <JazzIcon size={Number(size)} address={accountAddress} />
          ),
          [AvatarAccountType.Blockies]: (
            <Image
              source={{ uri: toDataUrl(accountAddress) }}
              style={stylesheet.imageStyle}
            />
          ),
        }[type]
      }
    </AvatarBase>
  );
};

export default AvatarAccount;

export { AvatarAccount };
