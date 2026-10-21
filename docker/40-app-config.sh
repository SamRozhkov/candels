#!/bin/sh
# Пишет runtime-конфиг фронтенда из переменных окружения контейнера.
set -eu

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's#<#\\u003c#g'
}

mkdir -p /tmp/app-config
cat > /tmp/app-config/config.js <<CONFIG
window.APP_CONFIG = {
  formEndpoint: "$(escape_js "${FORM_ENDPOINT:-}")"
};
CONFIG

if [ -n "${FORM_ENDPOINT:-}" ]; then
  echo "40-app-config.sh: config.js создан, FORM_ENDPOINT задан"
else
  echo "40-app-config.sh: FORM_ENDPOINT не задан — форма заявки работать не будет" >&2
fi
