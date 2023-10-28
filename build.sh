#!/usr/bin/env bash

echo "Preparing and building ..."

if [ -d "./dist" ]; then
  echo "Removing old build ..."
  rm -r ./dist
fi

echo "Compiling ..."
tsc -b

echo "Copying stubs ..."
mkdir ./dist/src/stubs
cp ./src/stubs/* ./dist/src/stubs

echo "All complete!"
