#!/usr/bin/env bash

echo "Preparing and building ..."

if [ -d "./build" ]; then
  echo "Removing old build ..."
  rm -r ./build
fi

echo "Compiling ..."
tsc -b

echo "Copying stubs and package.json ..."
mkdir ./build/src/stubs
cp ./src/stubs/* ./build/src/stubs
cp ./package.json ./build

echo "All complete!"
