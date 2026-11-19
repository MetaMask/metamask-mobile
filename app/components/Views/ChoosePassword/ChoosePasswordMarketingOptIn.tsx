import React from 'react';
import {
  TextVariant,
  ListItemMultiSelect,
  ListItemVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';

interface ChoosePasswordMarketingOptInProps {
  isSelected: boolean;
  onPress: () => void;
}

const ChoosePasswordMarketingOptIn = ({
  isSelected,
  onPress,
}: ChoosePasswordMarketingOptInProps) => (
  <ListItemMultiSelect
    variant={ListItemVariant.MultiLine}
    isSelected={isSelected}
    onPress={onPress}
    testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: isSelected }}
    twClassName="mt-2 border border-muted rounded-xl"
    titleProps={{
      variant: TextVariant.BodySm,
      testID: ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID,
    }}
    title={strings('choose_password.marketing_opt_in_description')}
  />
);

export default ChoosePasswordMarketingOptIn;
