#!/bin/bash
# Detect available runtime for FSRS helper
# Preference: node > python3 > python

if command -v node &> /dev/null; then
  echo "node"
elif command -v python3 &> /dev/null; then
  echo "python3"
elif command -v python &> /dev/null; then
  echo "python"
else
  echo "none"
fi
