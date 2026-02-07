Adding a new localization

Follow these steps to add support for a new language in the MetaMask mobile app.

Duplicate the en.json file under locales and rename it to the target locale (e.g. es.json).

Translate all strings in the new file.

Add the locale code to the list of supported languages in i18n/config.js.

Run yarn i18n:extract to ensure no keys are missing.

Test the app by switching the device language to verify translations.

Translation checklist:

Keep placeholders intact (e.g. {address}).

Shorten messages where necessary to fit on small screens.

Avoid embedding HTML tags in translation strings.
