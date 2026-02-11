import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

interface FakeSRPScreenProps {
  onComplete: () => void;
  onStepComplete: () => void;
}

const FakeSRPScreen = ({ onComplete, onStepComplete }: FakeSRPScreenProps) => {
  const tw = useTailwind();

  const handleComplete = () => {
    onStepComplete();
    onComplete();
  };

  return (
    <Box twClassName="flex-1 p-6 bg-background-default justify-center items-center">
      <Text
        variant={TextVariant.HeadingLG}
        color={TextColor.Default}
        twClassName="mb-4 text-center"
      >
        Secure Your Wallet
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        twClassName="mb-8 text-center"
      >
        This is a prototype screen representing the Secret Recovery Phrase backup flow.
      </Text>
      
      <Box twClassName="w-full p-4 border border-dashed border-border-muted rounded-lg mb-8">
        <Text variant={TextVariant.BodySM} color={TextColor.Muted} twClassName="italic text-center">
          [ Simulated SRP Phrase Display ]
        </Text>
      </Box>

      <Button
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        label="I've backed it up"
        onPress={handleComplete}
        width={ButtonWidthTypes.Full}
      />
      
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Md}
        label="Cancel"
        onPress={onComplete}
        width={ButtonWidthTypes.Full}
        style={tw.style('mt-2')}
      />
    </Box>
  );
};

export default FakeSRPScreen;
