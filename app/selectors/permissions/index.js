import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { createSelector } from 'reselect';

/**
 * This file contains selectors for PermissionController selector event
 * subscriptions, used to detect whenever a subject's accounts change so that
 * we can notify the subject via the `accountsChanged` provider event.
 */

/**
 * @param {Record<string, Record<string, unknown>>} state - The
 * PermissionController state.
 * @returns {Record<string, unknown>} The PermissionController subjects.
 */
/**
 * @param {Record<string, unknown>} state - The PermissionController state.
 * @returns {Record<string, unknown>} The PermissionController subject.
 */
const getSubjects = (state) => state.subjects;

/**
 * Get the authorized CAIP-25 scopes for the subject.
 * The returned value is an immutable value from the PermissionController state,
 * or an empty Caip25CaveatValue if no authorization exists.
 *
 * @param origin - The origin to match the subject state from.
 * @returns {Caip25CaveatValue} The current authorization or undefined if no authorization exists.
 */
export const getAuthorizedScopes = (origin) =>
  createSelector(getSubjects, (subjects) => {
    const subject = subjects[origin];

    const emptyPermission = {
      requiredScopes: {},
      optionalScopes: {},
      sessionProperties: {},
    };

    if (!subject) {
      return emptyPermission;
    }

    const caveats =
      subject.permissions?.[Caip25EndowmentPermissionName]?.caveats || [];

    const caveat = caveats.find(({ type }) => type === Caip25CaveatType);

    return caveat?.value ?? emptyPermission;
  });
