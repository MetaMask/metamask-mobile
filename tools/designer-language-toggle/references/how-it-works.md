# How the preview changes language

The app does not read a query string or a launch argument for language. This is the path a dev build actually uses.

## What the app does today

`locales/i18n.js` loads 15 locale modules (`de`, `el`, `en`, `es`, `fr`, `hi`, `id`, `ja`, `ko`, `pt`, `ru`, `tl`, `tr`, `vi`, `zh`) and registers them on `react-native-i18n`.

On startup it calls `getUserPreferableLocale()`. That reads the MMKV key `@MetaMask:language` (`LANGUAGE` in `app/constants/storage.ts`) through `StorageWrapper`. The read is async. If a value is stored, it assigns `I18n.locale` after the module has already started.

Settings > General > Current language lives in `app/components/Views/Settings/GeneralSettings/index.tsx`. The picker is `getLanguages()`. Choosing a language calls `setLocale`, which writes the same MMKV key and sends the user home.

`isRTL` in `locales/i18n.js` is the constant `false`. `I18nManager.allowRTL(false)` follows it. Arabic and other RTL locales are not shipped. v0 does not change that.

## Why the script patches `locales/i18n.js`

Writing MMKV from Node on the host does not change the storage inside an Android preview. The reliable dev-build switch is synchronous, in the JS bundle, before the async storage read:

1. `apply-locale.js` copies `locales/i18n.js` to `locales/.designer-locale.i18n.js.bak` once.
2. It inserts a small block that sets `I18n.locale` while the module loads.
3. When a locale or a pseudo mode is forced, `getUserPreferableLocale` returns immediately, so the saved language cannot overwrite the preview.
4. When `--languages` is set, `getLanguages()` returns only those codes. Settings > General > Current language uses that list.

The block is marked `DESIGNER-LOCALE-OVERRIDE`. `revert-locale.js` puts the backup back. Edits made to `locales/i18n.js` after the preview was applied go away with the revert.

Reload the bundler after apply or revert. A prebuilt APK that does not serve this checkout will not see the patch. In that case use Settings > General > Current language. That picker writes `@MetaMask:language` on the device and survives the next launch of that same install.

## Pseudo modes

`--pseudo accented` wraps each English string in ⟦ ⟧ and accents vowels, so overflow is obvious. Placeholders such as `{{fee}}` are left intact.

`--pseudo longest` walks the 15 shipped files and keeps the widest string for each key. Width treats CJK, kana, and hangul as 2, and other letters as 1.

Both modes set `I18n.locale` to `pseudo` and load `locales/designer-pseudo.generated.json`. That file is generated. It is not a Crowdin file. General Settings takes `locale.substr(0, 2)`, so the picker label for this mode shows up as `ps`.

## What the check compares

`check-strings.js` flattens `en.json` and the shipped file for the language (`de.json`, not a regional name). It reports:

- Missing: the English key is absent or blank.
- Still English: the value equals English. Strings shorter than 3 characters, strings with no real word once `{{placeholders}}` are removed, and strings that match English in at least 80% of the other shipped files (and at least 8 of them) are skipped. `--strict` lists the shared ones too.
- Too long: display width is at least 1.4× English, at least 4 width units longer, and the English string is at least 4 wide.

Regional files (`ja-jp.json`, `zh-cn.json`, `pt-br.json`, and the other `xx-yy.json` files next to the shipped JSON) are counted in a separate section. `locales/i18n.js` does not import them. Crowdin's config (`crowdin.yml`) uploads `en.json` and downloads `%two_letters_code%.json`, which is the shipped two-letter file.

## Date hints

The check looks for numeric dates and format tokens inside the scoped strings, and, when `--feature perps` or `--feature social` is set, for hard-coded date code:

- `'en-US'` on a line that is formatting a date (number formatters are ignored)
- English month lists (`Jan`, `Feb`, …)
- `hour12: true` (AM/PM)
- `formatTimestampToYYYYMMDD`
- quoted `YYYY` / `HH:mm` style literals

Perps order timestamps are built in `app/components/UI/Perps/utils/formatUtils.ts` (`formatTransactionDate`, `formatOrderCardDate`, `formatProOrderCardTimestamp`, `formatDateSection`). Some of those force `en-US` or an English month array. The check reports the lines it finds. It does not rewrite them.
