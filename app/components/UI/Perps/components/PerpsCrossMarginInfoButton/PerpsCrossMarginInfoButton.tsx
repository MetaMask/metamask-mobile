import React, { useCallback, useState } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import PerpsProModalPortal from '../../Views/PerpsProMarketView/components/PerpsProModalPortal';

interface PerpsCrossMarginInfoButtonProps {
  /** Whether the venue currently supplies a liquidation price. */
  hasLiquidationPrice: boolean;
  /** Identifies this position's information button within its view. */
  testID: string;
}

/** Explains the shared collateral behind a cross position's liquidation price. */
const PerpsCrossMarginInfoButton = ({
  hasLiquidationPrice,
  testID,
}: PerpsCrossMarginInfoButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const handleOpen = useCallback(() => setIsVisible(true), []);
  const handleClose = useCallback(() => setIsVisible(false), []);

  return (
    <>
      <ButtonIcon
        iconName={IconName.Info}
        size={ButtonIconSize.Sm}
        accessibilityLabel={strings('perps.cross_position.liquidation_info')}
        testID={testID}
        onPress={handleOpen}
      />
      {isVisible && (
        <PerpsProModalPortal onRequestClose={handleClose}>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={handleClose}
            contentKey={
              hasLiquidationPrice
                ? 'cross_liquidation_price'
                : 'cross_no_liquidation_price'
            }
          />
        </PerpsProModalPortal>
      )}
    </>
  );
};

export default PerpsCrossMarginInfoButton;
