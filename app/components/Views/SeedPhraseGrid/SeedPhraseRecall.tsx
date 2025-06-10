import React, { useState, useEffect } from 'react';
import { SeedPhraseGrid } from './SeedPhraseGrid';
import { View } from 'react-native';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';

interface SeedPhraseRevealProps {
  seedPhrase: string[];
}

const generateRandomNumbers = (
  min: number,
  max: number,
  count: number,
): number[] => {
  const numbers: number[] = [];
  const availableNumbers = Array.from(
    { length: max - min + 1 },
    (_, i) => i + min,
  );

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    numbers.push(availableNumbers[randomIndex]);
    availableNumbers.splice(randomIndex, 1); // Remove to avoid duplicates
  }

  return numbers;
};

export const SeedPhraseRecall = ({ seedPhrase }: SeedPhraseRevealProps) => {
  const [randomWordIndexes] = useState(
    generateRandomNumbers(0, seedPhrase.length - 1, 3),
  );
  const [selectedWordOrder, setSelectedWordOrder] = useState<number[]>([]);
  const [disabledButtons, setDisabledButtons] = useState<Set<number>>(
    new Set(),
  );
  const [seedPhraseToShow, setSeedPhraseToShow] = useState<string[]>([]);

  useEffect(() => {
    console.log('Setting up with randomWordIndexes:', randomWordIndexes);
    console.log('Seed phrase length:', seedPhrase.length);
    console.log('Seed phrase:', seedPhrase);

    const initialDisplay = seedPhrase.map((word, index) => {
      const shouldHide = randomWordIndexes.includes(index);
      console.log(`Index ${index}, word "${word}", shouldHide: ${shouldHide}`);
      if (!shouldHide) {
        return word;
      }
      return '';
    });

    console.log('Initial display:', initialDisplay);
    setSeedPhraseToShow(initialDisplay);
  }, [seedPhrase, randomWordIndexes]);

  const handleWordPress = (index: number) => {
    const isCurrentlySelected = selectedWordOrder.includes(index);

    if (isCurrentlySelected) {
      // Unselect the word
      const newSelectedOrder = selectedWordOrder.filter((i) => i !== index);
      setSelectedWordOrder(newSelectedOrder);

      // Enable the button
      setDisabledButtons((prev) => {
        const newDisabled = new Set(prev);
        newDisabled.delete(index);
        return newDisabled;
      });

      // Update seed phrase display to remove this word and shift remaining words
      setSeedPhraseToShow((prev) => {
        const newSeedPhrase = [...prev];
        const sortedRandomIndexes = [...randomWordIndexes].sort(
          (a, b) => a - b,
        );

        // Clear all random positions first
        sortedRandomIndexes.forEach((pos) => {
          newSeedPhrase[pos] = '';
        });

        // Fill positions with remaining selected words in order
        newSelectedOrder.forEach((selectedIndex, orderIndex) => {
          if (orderIndex < sortedRandomIndexes.length) {
            newSeedPhrase[sortedRandomIndexes[orderIndex]] =
              seedPhrase[selectedIndex];
          }
        });

        return newSeedPhrase;
      });

      console.log(`Unselected word at index ${index}: "${seedPhrase[index]}"`);
    } else {
      // Select the word
      const newSelectedOrder = [...selectedWordOrder, index];
      setSelectedWordOrder(newSelectedOrder);

      // Disable the button
      setDisabledButtons((prev) => new Set([...prev, index]));

      // Update seed phrase display to show word in next available position (ascending order)
      setSeedPhraseToShow((prev) => {
        const newSeedPhrase = [...prev];
        const sortedRandomIndexes = [...randomWordIndexes].sort(
          (a, b) => a - b,
        );
        const positionToFill = sortedRandomIndexes[selectedWordOrder.length];
        newSeedPhrase[positionToFill] = seedPhrase[index];
        return newSeedPhrase;
      });

      // Check if the selection is in the correct order
      const sortedRandomIndexes = [...randomWordIndexes].sort((a, b) => a - b);
      const expectedIndex = sortedRandomIndexes[newSelectedOrder.length - 1];
      const isCorrect = index === expectedIndex;

      console.log(`Selected word at index ${index}: "${seedPhrase[index]}"`);
      console.log(`Expected index: ${expectedIndex}, Is correct: ${isCorrect}`);
    }

    console.log(
      `Selection order:`,
      selectedWordOrder.map((i) => `${i}: "${seedPhrase[i]}"`),
    );
  };

  return (
    <View>
      <SeedPhraseGrid
        seedPhrase={seedPhraseToShow}
        setSeedPhrase={() => {}}
        isEditable={false}
        canShowSeedPhraseWord={(index) => randomWordIndexes.includes(index)}
        hideSeedPhraseInput={false}
        showAllSeedPhrase={false}
      />
      <View>
        {randomWordIndexes.map((index) => (
          <Button
            key={index}
            onPress={() => handleWordPress(index)}
            label={seedPhrase[index]}
            variant={ButtonVariants.Secondary}
            disabled={disabledButtons.has(index)}
          />
        ))}
      </View>
    </View>
  );
};
