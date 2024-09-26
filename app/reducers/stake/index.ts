import { RootState } from "..";
import { selectSelectedInternalAccountChecksummedAddress } from "../../selectors/accountsController";
import { selectChainId } from "../../selectors/networkController";
import { getDecimalChainId } from '../../util/networks';
import type { Action as ReduxAction } from 'redux';


/**
* Selectors
*/
export const chainIdSelector: (state: RootState) => string = (
  state: RootState,
) => getDecimalChainId(selectChainId(state));

export const selectedAddressSelector: (
  state: RootState,
) => string | undefined = (state: RootState) =>
    selectSelectedInternalAccountChecksummedAddress(state);
