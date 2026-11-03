#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
name="${ORCA_CONTAINER_NAME:-snapmaker-orca-web}"
image="localhost/snapmaker-orca-web:2.4.1-multi"
if podman container exists "$name"; then
 echo "Existing container $name; will not replace." >&2
 exit 2
fi
podman build -t "$image" -f Containerfile .
podman volume create orca-web-config >/dev/null
podman run -d --name "$name" --restart=unless-stopped --shm-size=2g \
 -e "PUID=${PUID:-1000}" -e "PGID=${PGID:-1000}" -e "TZ=${TZ:-Etc/UTC}" \
 -e "SELKIES_FILE_TRANSFERS=upload,download" \
 -e "SELKIES_UI_SIDEBAR_SHOW_FILES=true" -e "FILE_MANAGER_PATH=/config/Desktop" \
 -p "${HOST_BIND:-127.0.0.1}:${HTTPS_PORT:-3301}:3001" \
 -p "127.0.0.1:${HTTP_ORIGIN_PORT:-3300}:3000" \
 -v orca-web-config:/config \
 -v "$PWD/src/mobile-index.html:/usr/share/selkies/web/index.html:ro" \
 -v "$PWD/src/mobile.js:/usr/share/selkies/web/snapmaker-mobile.js:ro" "$image"
echo "Local: https://127.0.0.1:${HTTPS_PORT:-3301}/"
