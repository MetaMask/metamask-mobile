import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface ChildrenProps {
  children: React.ReactNode;
}

interface RootProps extends ChildrenProps {
  testID?: string;
}

const Root = ({ children, testID }: RootProps) => (
  <Box testID={testID} twClassName="gap-[14px] rounded-2xl bg-section p-4">
    {children}
  </Box>
);

const Header = ({ children }: ChildrenProps) => (
  <Box twClassName="flex-row items-center gap-3">{children}</Box>
);

const Summary = ({ children }: ChildrenProps) => (
  <Box twClassName="min-w-0 flex-1 gap-1">{children}</Box>
);

const Title = ({ children, testID }: ChildrenProps & { testID?: string }) => (
  <Text
    testID={testID}
    variant={TextVariant.HeadingSm}
    fontWeight={FontWeight.Bold}
    numberOfLines={1}
  >
    {children}
  </Text>
);

const Volume = ({ value, testID }: { value: string; testID?: string }) => (
  <Text
    testID={testID}
    variant={TextVariant.BodySm}
    color={TextColor.TextAlternative}
    twClassName="text-[13px] leading-[18px]"
  >
    ${value} Vol.
  </Text>
);

const Percentage = ({ value, testID }: { value: number; testID?: string }) => (
  <Text
    testID={testID}
    variant={TextVariant.HeadingLg}
    fontWeight={FontWeight.Medium}
    twClassName="leading-[30px]"
  >
    {Math.round(value)}%
  </Text>
);

const SplitBar = ({
  yesPercent,
  testID,
  yesTestID,
  noTestID,
}: {
  yesPercent: number;
  testID?: string;
  yesTestID?: string;
  noTestID?: string;
}) => (
  <Box testID={testID} twClassName="h-0.5 flex-row gap-1">
    <Box
      testID={yesTestID}
      twClassName="rounded-full bg-success-default"
      style={{ flex: yesPercent }}
    />
    <Box
      testID={noTestID}
      twClassName="rounded-full bg-error-default"
      style={{ flex: 100 - yesPercent }}
    />
  </Box>
);

const Actions = ({ children }: ChildrenProps) => (
  <Box twClassName="flex-row gap-[10px]">{children}</Box>
);

const noOp = (): void => undefined;

const OutcomeButton = ({
  label,
  price,
  side,
  testID,
}: {
  label: string;
  price?: string;
  side: 'yes' | 'no';
  testID?: string;
}) => {
  const displayLabel = price ? `${label} · ${price}` : label;

  return (
    <Button
      testID={testID}
      accessibilityLabel={
        price ? `${label}, ${price}` : `${label}, price unavailable`
      }
      accessibilityState={{ disabled: false }}
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      onPress={noOp}
      twClassName="h-12 min-w-0 flex-1 rounded-xl bg-muted px-2"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={
          side === 'yes' ? TextColor.SuccessDefault : TextColor.ErrorDefault
        }
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </Button>
  );
};

export const MarketCard = {
  Root,
  Header,
  Summary,
  Title,
  Volume,
  Percentage,
  SplitBar,
  Actions,
  OutcomeButton,
};
