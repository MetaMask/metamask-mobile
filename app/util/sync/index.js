/**
 * Function to persist the old account name during an new preferences update
 * @param {Object} oldPrefs - old preferences object containing the account names
 * @param {Object} updatedPref - preferences object that will be updated with oldPrefs
 */
export async function syncPrefs(oldPrefs, updatedPref) {
  try {
    Object.keys(oldPrefs.identities).forEach((ids) => {
      if (updatedPref.identities[ids]) {
        updatedPref.identities[ids] = oldPrefs.identities[ids];
      }
    });

    return updatedPref;
  } catch (err) {
    return updatedPref;
  }
}

/**
 * Function to persist the old account balance during an vault update
 * @param {Object} oldAccounts - old account object containing the account names
 * @param {Object} updatedAccounts - accounts object that will be updated with old accout balance
 */
export async function syncAccounts(oldAccounts, updatedAccounts) {
  try {
    Object.keys(oldAccounts).forEach((account) => {
      if (updatedAccounts[account]) {
        updatedAccounts[account] = oldAccounts[account];
      }
    });

    return updatedAccounts;
  } catch (err) {
    return updatedAccounts;
  }
}
