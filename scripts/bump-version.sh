#!/usr/bin/env bash

set -e
set -u
set -o pipefail

versionName="$(awk '/VERSION_NAME: /{print $2}' bitrise.yml)"

<<<<<<< HEAD
MAJOR=$(awk -F. '{print $1}' <<< $versionName)
MINOR=$(awk -F. '{print $2}' <<< $versionName)
PATCH=$(awk -F. '{print $3}' <<< $versionName)
=======
MAJOR=$(awk -F. '{print $1}' <<< "$versionName")
MINOR=$(awk -F. '{print $2}' <<< "$versionName")
PATCH=$(awk -F. '{print $3}' <<< "$versionName")
>>>>>>> develop
version=$MAJOR'.'$MINOR'.'$PATCH

if [[ $1 == *"release/"* ]] ; then
    if [[ $1 == *"-major"* ]] ; then
<<<<<<< HEAD
        major=$(($MAJOR +  1));
=======
        major=$((MAJOR +  1));
>>>>>>> develop
        minor="0";
        patch="0";
        version=$major'.'$minor'.'$patch
    elif [[ $1 == *"-minor"* ]] ; then
<<<<<<< HEAD
        minor=$(($MINOR +  1));
        patch="0";
        version=$MAJOR'.'$minor'.'$patch
    elif [[ $1 == *"-patch"* ]] ; then
        patch=$(($PATCH +  1));
=======
        minor=$((MINOR +  1));
        patch="0";
        version=$MAJOR'.'$minor'.'$patch
    elif [[ $1 == *"-patch"* ]] ; then
        patch=$((PATCH +  1));
>>>>>>> develop
        version=$MAJOR'.'$MINOR'.'$patch
    fi

    echo "Bumping versionName to"
<<<<<<< HEAD
    echo $version

    sed -i -e 's/VERSION_NAME: [0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}/VERSION_NAME: '$version'/' bitrise.yml
    sed -i -e 's/"version": "[0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}"/"version": "'$version'"/' package.json
=======
    echo "$version"

    sed -i -e 's/VERSION_NAME: [0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}/VERSION_NAME: '"$version"'/' bitrise.yml
    sed -i -e 's/"version": "[0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}"/"version": "'"$version"'"/' package.json
>>>>>>> develop

    echo "Bumping versionName finished"
fi
