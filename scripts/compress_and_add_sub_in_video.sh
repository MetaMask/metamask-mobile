#!/usr/bin/env bash

set -e
set -u
set -o pipefail

# This script is used to compress the SRP video and add all subtitles to it.
# It uses ffmpeg to compress the video and add subtitles from the subtitles folder.
# It uses two passes encoding to target a small video file size (reduces quality).
# It uses the mov_text codec to add subtitles to the video.
# It uses the language code to set the default language track.

VIDEO_PATH=./app/videos/
INPUT_VIDEO=${VIDEO_PATH}recovery-phrase-source.mp4
OUTPUT_VIDEO=${VIDEO_PATH}recovery-phrase.mp4
SUBS_PATH=${VIDEO_PATH}subtitles/secretPhrase/

VIDEO_BITRATE="75k"
AUDIO_BITRATE="80k"

ffmpeg_subtitle_inputs=""
ffmpeg_subtitle_map_inputs=""
ffmpeg_subtitle_metadata=""
ffmpeg_subtitle_map_inputs_start=1
ffmpeg_subtitle_default_language="en"
ffmpeg_subtitle_default_track=0

# map all language to language code
# as languages 2 letter codes are not the same as language codes used by ffmpeg
# https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
language_code_map=(
  "de:deu"
  "el:ell"
  "en:eng"
  "es:spa"
  "fr:fra"
  "hi:hin"
  "id:ind"
  "ja:jpn"
  "ko:kor"
  "pt:por"
  "ru:rus"
  "tl:tgl"
  "tr:tur"
  "vi:vie"
  "zh:zho"
)

# check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null
then
    echo "ffmpeg could not be found."
    echo "Please install ffmpeg before running this script."
    echo "https://ffmpeg.org/download.html"
    exit 1
fi

# check source video exists
if [ ! -f "$INPUT_VIDEO" ]; then
  echo "Source video file ${$INPUT_VIDEO} does not exist."
  echo "Please add the source video file to the ${VIDEO_PATH} folder."
  exit 1
fi

# check if subtitles folder exists
if [ ! -d "$SUBS_PATH" ]; then
  echo "Subtitles folder ${SUBS_PATH} does not exist."
  echo "Please add the subtitles folder to the ${VIDEO_PATH} folder."
  exit 1
fi

# add all subtitles files to video
subs_files=("${SUBS_PATH}"*.vtt)
for i in "${!subs_files[@]}"; do
  # extract language code string from file name
  # e.g. subtitles-en.vtt -> en
  language=$(echo " ${subs_files[$i]}" | cut -d'-' -f2 | cut -d'.' -f1)
  language_code=$(echo "${language_code_map[@]}" | grep -o "$language:[a-z]\{3\}" | cut -d':' -f2)
  # add each subtitle input and track metadata to ffmpeg command
  ffmpeg_subtitle_inputs="$ffmpeg_subtitle_inputs -i ${subs_files[$i]}"
  ffmpeg_subtitle_metadata="$ffmpeg_subtitle_metadata -metadata:s:s:$i language=$language_code"
  # Set map input for each subtitle track to ffmpeg command
  # add 1 to index because the first map is the video
  map_index=$(($i+$ffmpeg_subtitle_map_inputs_start))
  # set default track if language is default language
  if [ "$language" = "$ffmpeg_subtitle_default_language" ]; then
    ffmpeg_subtitle_default_track=$i
  fi
  # add map input to ffmpeg command
  ffmpeg_subtitle_map_inputs="$ffmpeg_subtitle_map_inputs -map $map_index"
done

# Run a two passes encoding
TWO_PASSES_OUTPUT_VIDEO_FILE=recovery-phrase-temp.mp4
ffmpeg -y -i $INPUT_VIDEO -passlogfile ${VIDEO_PATH}2pass -pass 1 -c:v libx264 -b:v $VIDEO_BITRATE -b:a $AUDIO_BITRATE -an -f null /dev/null && \
ffmpeg -y -i $INPUT_VIDEO -passlogfile ${VIDEO_PATH}2pass -pass 2 -c:v libx264 -b:v $VIDEO_BITRATE -b:a $AUDIO_BITRATE $TWO_PASSES_OUTPUT_VIDEO_FILE

# Add subtitles to video
ffmpeg -y -i $TWO_PASSES_OUTPUT_VIDEO_FILE \
${ffmpeg_subtitle_inputs} \
-map 0 \
${ffmpeg_subtitle_map_inputs} \
-c copy -c:s mov_text \
${ffmpeg_subtitle_metadata} \
-disposition:s:${ffmpeg_subtitle_default_track} default \
$OUTPUT_VIDEO

# Remove temp files
rm $TWO_PASSES_OUTPUT_VIDEO_FILE ${VIDEO_PATH}2pass-*.log ${VIDEO_PATH}2pass-*.log.mbtree
