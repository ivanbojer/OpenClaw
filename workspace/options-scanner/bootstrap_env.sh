#!/usr/bin/env bash
set -euo pipefail

VENV_DIR="${1:-.venv}"

echo "Creating venv in $VENV_DIR ..."
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

echo "Upgrading pip ..."
python -m pip install -U pip setuptools wheel -q

echo "Installing dependencies ..."
python -m pip install -r requirements.txt

echo ""
echo "Done. To activate later: source $VENV_DIR/bin/activate"
echo "Run scanner:  python scanner.py --config criteria.yaml"
echo "Run tests:    pytest tests/"
