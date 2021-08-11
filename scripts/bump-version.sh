#!/usr/bin/env bash

set -e
set -u
set -o pipefail

versionName="$(awk '/VERSION_NAME: /{print $2}' bitrise.yml)"
versionNumber="$(awk '/VERSION_NUMBER: /{print $2}' bitrise.yml)"

MAJOR=$(awk -F. '{print $1}' <<< "$versionName")
MINOR=$(awk -F. '{print $2}' <<< "$versionName")
PATCH=$(awk -F. '{print $3}' <<< "$versionName")
version=$MAJOR'.'$MINOR'.'$PATCH

let "versionNumber+=1"

echo "Bumping versionNumber to"
echo "$versionNumber"

sed -i -e 's/VERSION_NUMBER: [0-9]\{1,\}/VERSION_NUMBER: '"$versionNumber"'/' bitrise.yml

echo "Bumping versionNumber finished"

if [[ $1 == *"release/"* ]] ; then
    if [[ $1 == *"-major"* ]] ; then
        major=$((MAJOR +  1));
        minor="0";
        patch="0";
        version=$major'.'$minor'.'$patch
    elif [[ $1 == *"-minor"* ]] ; then
        minor=$((MINOR +  1));
        patch="0";
        version=$MAJOR'.'$minor'.'$patch
    elif [[ $1 == *"-patch"* ]] ; then
        patch=$((PATCH +  1));
        version=$MAJOR'.'$MINOR'.'$patch
    fi
    
    echo "Bumping versionName to"
    echo "$version"


    sed -i -e 's/VERSION_NAME: [0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}/VERSION_NAME: '"$version"'/' bitrise.yml
    sed -i -e 's/"version": "[0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}"/"version": "'"$version"'"/' package.json

    echo "Bumping versionName finished"
fi
