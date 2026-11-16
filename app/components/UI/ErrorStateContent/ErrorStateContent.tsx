import React from 'react';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import FailureImage from '../../../images/mfa-failure.svg';

interface ErrorStateContentProps {
  title: React.ReactNode;
  description: React.ReactNode;
  titleTestID?: string;
  descriptionTestID?: string;
  illustrationTestID?: string;
}

const ErrorStateContent = ({
  title,
  description,
  titleTestID,
  descriptionTestID,
  illustrationTestID,
}: ErrorStateContentProps) => (
  <Box alignItems={BoxAlignItems.Center} gap={6} twClassName="w-full">
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName="w-full"
      testID={illustrationTestID}
    >
      <FailureImage name="error-state-failure" />
    </Box>
    <Box alignItems={BoxAlignItems.Center} gap={1} twClassName="w-full">
      {typeof title === 'string' ? (
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="text-center"
          testID={titleTestID}
        >
          {title}
        </Text>
      ) : (
        <Box alignItems={BoxAlignItems.Center} testID={titleTestID}>
          {title}
        </Box>
      )}
      {typeof description === 'string' ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={descriptionTestID}
        >
          {description}
        </Text>
      ) : (
        <Box alignItems={BoxAlignItems.Center} testID={descriptionTestID}>
          {description}
        </Box>
      )}
    </Box>
  </Box>
);

export default ErrorStateContent;
