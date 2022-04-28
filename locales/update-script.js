/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */

const fs = require('fs');
const languagesFolder = './languages';
const languagesToUpdateFolder = './languagesToUpdate';
const en = require(`${languagesFolder}/en.json`);

/**
 * Checks every language on the language folder and updates all the languages to the same format as en.json
 */

const updateLanguage = (language) => {
  const languageToUpdate = require(`${languagesToUpdateFolder}/${language}`);

  let existentLanguage = {};
  if (fs.existsSync(`${languagesFolder}/${language}`)) {
    existentLanguage = require(`${languagesFolder}/${language}`);
  }

  const updated = {};

  for (const screenKey in en) {
    // Checks if either the new language file or the existent language file has the screen key
    if (languageToUpdate[screenKey] || existentLanguage[screenKey]) {
      updated[screenKey] = {};
      for (const translationKey in en[screenKey]) {
        // Update the language either with the new translation or the existent one if it exists
        if (
          languageToUpdate[screenKey] &&
          languageToUpdate[screenKey][translationKey]
        ) {
          updated[screenKey][translationKey] =
            languageToUpdate[screenKey][translationKey];
        } else if (
          existentLanguage[screenKey] &&
          existentLanguage[screenKey][translationKey]
        ) {
          updated[screenKey][translationKey] =
            existentLanguage[screenKey][translationKey];
        }
      }
    }
  }

  fs.writeFileSync(
    `${languagesFolder}/${language}`,
    JSON.stringify(updated, null, '\t') + '\n',
  );
  console.log(language + ' updated!');
};

const allLanguagesToUpdateFiles = fs.readdirSync(languagesToUpdateFolder);
const languageFilesToUpdate = allLanguagesToUpdateFiles.filter(
  (lang) => lang !== 'en.json' && lang.endsWith('.json'),
);
languageFilesToUpdate.forEach(updateLanguage);
console.log('All done!');

// Uncomment this for copying faster the list of languages into i18n.js
/*
// Given a name like pt-br, camel case it to ptBr to copy as a variable into i18n.js
const camelCase = str => str.toLowerCase().replace(/-(.)/g, (match, group1) => group1.toUpperCase());
// Print to console to make it easy to copy and add languages to i18n.js
console.log("\nCopy this to i18n.js if it's not there\n");
const allLanguageFiles = fs.readdirSync(languagesFolder).filter(lang => lang.endsWith('.json'));
allLanguageFiles.forEach(lang =>
  console.log(`import ${camelCase(lang.replace('.json', ''))} from './languages/${lang}'`)
);
console.log(`\nI18n.translations = {`);
allLanguageFiles.forEach(lang => console.log(`\t${camelCase(lang.replace('.json', ''))},`));
console.log(`}`);

*/
