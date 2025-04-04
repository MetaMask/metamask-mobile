import { RootState } from '../../reducers';

/**
 * Each validation check is a function that:
 * - Takes the final (post-migration) Redux state,
 * - Returns an array of error strings if any validations fail or an empty array otherwise.
 */
export type ValidationCheck = (state: RootState) => string[];

export const LOG_TAG = 'MIGRATION_VALIDATE_STATE_ERROR';
