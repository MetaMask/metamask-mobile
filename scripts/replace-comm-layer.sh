#!/bin/bash

cd /Users/arthurbreton/Projects/metamask/metamask-mobile

## dirty hack to debug
rm -rf node_modules/@metamask/sdk-communication-layer
cp -rf ~/Projects/metamask/metamask-sdk/packages/sdk-communication-layer node_modules/@metamask/

pwd

node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack
