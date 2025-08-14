import { useSelector } from 'react-redux';
import { selectIsCardholder } from '../../../../core/redux/slices/card';

/**
 * Custom hook that returns whether the currently selected account is a cardholder.
 *
 * @returns boolean - true if the current account is a cardholder, false otherwise
 */
export const useIsCardholder = (): boolean => !!useSelector(selectIsCardholder);
