#!/usr/bin/env bash

versionName="$(awk '/VERSION_NAME: /{print $2}' bitrise.yml)"

MAJOR=$(awk -F. '{print $1}' <<< $versionName)
MINOR=$(awk -F. '{print $2}' <<< $versionName)
PATCH=$(awk -F. '{print $3}' <<< $versionName)

branchName=$(git rev-parse --symbolic --abbrev-ref HEAD)

if [ $branchName == "--major" ] ; then
    major=$(($MAJOR +  1));
    minor="0";
    patch="0";
    version=$major'.'$minor'.'$patch
elif [ $branchName == "--minor" ] ; then
    minor=$(($MINOR +  1));
    patch="0";
    version=$MAJOR'.'$minor'.'$patch
elif [ $branchName == "--patch" ] ; then
    patch=$(($PATCH +  1));
    version=$MAJOR'.'$MINOR'.'$patch
else
    version=$MAJOR'.'$MINOR'.'$PATCH
fi
sed -i '' -e 's/VERSION_NAME: [0-9]\{1,\}.[0-9]\{1,\}.[0-9]\{1,\}/VERSION_NAME: '$version'/' bitrise.yml
echo $version
echo $branchName
