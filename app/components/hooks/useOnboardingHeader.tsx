import React, { useCallback, useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../component-library/components/Texts/Text';
import { IconName } from '../../component-library/components/Icons/Icon';
import ButtonIcon from '../../component-library/components/Buttons/ButtonIcon';
import { ButtonIconSizes } from '../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';

const styles = {
  backButtonContainer: {
    marginLeft: 6,
  },
};

export const useOnboardingHeader = (title: string) => {
  const navigation = useNavigation();

  const renderBackButton = useCallback(
    () => (
      <ButtonIcon
        size={ButtonIconSizes.Lg}
        iconName={IconName.ArrowLeft}
        accessibilityRole="button"
        accessibilityLabel="back"
        onPress={() => navigation.goBack()}
        style={styles.backButtonContainer}
      />
    ),
    [navigation],
  );

  const renderTitle = useCallback(
    () => <Text variant={TextVariant.HeadingMD}>{title}</Text>,
    [title],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);
};
