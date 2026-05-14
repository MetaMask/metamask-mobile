import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '../../../../util/theme';
import {
  clearMusdConversionAssetDetailCtasSeen,
  setMusdConversionEducationSeen,
} from '../../../../actions/user';
import {
  selectMusdConversionAssetDetailCtasSeen,
  selectMusdConversionEducationSeen,
} from '../../../../reducers/user';
import { useStyles } from '../../../../component-library/hooks';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import styleSheet from '../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

export const MusdDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const hasSeenConversionEducationScreen = useSelector(
    selectMusdConversionEducationSeen,
  );
  const musdConversionAssetDetailCtasSeen = useSelector(
    selectMusdConversionAssetDetailCtasSeen,
  );
  const assetDetailCtasSeenCount = useMemo(
    () => Object.keys(musdConversionAssetDetailCtasSeen).length,
    [musdConversionAssetDetailCtasSeen],
  );

  const handleResetEducationSeenState = useCallback(() => {
    dispatch(setMusdConversionEducationSeen(false));
  }, [dispatch]);

  const handleClearAssetDetailCtasSeen = useCallback(() => {
    dispatch(clearMusdConversionAssetDetailCtasSeen());
  }, [dispatch]);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {'mUSD'}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {`Education screen seen: ${String(hasSeenConversionEducationScreen)}`}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={'Reset education screen'}
        onPress={handleResetEducationSeenState}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {`Asset detail CTAs dismissed: ${String(assetDetailCtasSeenCount)}`}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={'Clear asset detail CTAs seen'}
        onPress={handleClearAssetDetailCtasSeen}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </>
  );
};
