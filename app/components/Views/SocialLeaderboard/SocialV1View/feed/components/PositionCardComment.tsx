import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

export interface PositionCardCommentProps {
  comment?: string;
  testID?: string;
}

const PositionCardComment: React.FC<PositionCardCommentProps> = ({
  comment,
  testID,
}) => {
  if (!comment) {
    return null;
  }

  return (
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextDefault}
      testID={testID}
    >
      {comment}
    </Text>
  );
};

export default PositionCardComment;
