#!/bin/sh

mkdir -p ../build

cat ../src/js/fluid.js ../src/js/colors.js ../src/js/main.js > ../build/f.js
cat ../src/css/main.css > ../build/f.css

cp -f ../src/index.html ../build/index.html
cp -f ../src/favicon.ico ../build/favicon.ico