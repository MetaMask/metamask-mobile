# Warning about video and subtitles

This folder contains video and subtitles that are currently served as raw content from GitHub repos directly to the mobile app.

:warning: Video is now bundled in the app but until 100% of apps in production are using the new bundled version,
there's still chances that the raw video served from GitHub is used.
Do not rename or remove the `app/videos/recovery-phrase.mp4` file until you are totally sure of what you do.

:warning: Subtitles are moved in the bundled video branch but until 100% of apps in production are using the new bundled video, they are still served raw from GitHub repos main.
Do not rename or remove the `app/videos/Subtitles` folder until you are totally sure of what you do.

## Video encoding

`recovery-phrase.mp4` is encoded from source `recovery-phrase-source.mp4` video using the script `scripts/compress_and_add_sub_in_video.sh`.

## Subtitles languages

Encoding the subtitles in the video uses a static map of languages codes. If you add a new language subtitle file you also have to add the mapping in the `language_code_map` variable in  `scripts/compress_and_add_sub_in_video.sh`
