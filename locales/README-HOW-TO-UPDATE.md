# Description
The `update-script.js` updates all the languages inside the `languages` folder according to `en.json`. This ensures that, when we get new or updated languages, they will get checked against the default locale: All keys will get organized like `en.json`, existing keys will get updated, missing keys will be added and any extra keys will get removed.

# How to update the languages
- Put the language files you want to be updated inside the `languagesToUpdate` folder
- On your terminal cd to `/locales`
- Run `node update-script.js`
- That's it, all the languages were updated! Now you can add them to i18n.js