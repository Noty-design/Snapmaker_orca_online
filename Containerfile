ARG BASE_IMAGE=lscr.io/linuxserver/orcaslicer@sha256:b8806fab27725e26ddd14a24f22990bf0780bc7fdadb43e23120b9a1c16c8b88
FROM ${BASE_IMAGE}
ENV TITLE="Snapmaker Orca" GDK_BACKEND=x11 PIXELFLUX_WAYLAND=false NO_GAMEPAD=true
RUN set -eu; \
  f=/tmp/snapmaker-orca.AppImage; \
  url="https://github.com/Snapmaker/OrcaSlicer/releases/download/v2.4.1/Snapmaker_Orca_Linux_AppImage_Ubuntu2404_V2.4.1.AppImage"; \
  curl -fL --retry 4 --retry-delay 3 -o "$f" "$url"; \
  printf '%s  %s\n' '2b5117e22d04a3a27bcdfc5a873c55d28ff3b7ce9721946de1f134fa97d2cc06' "$f" | sha256sum -c -; \
  chmod +x "$f"; cd /tmp; "$f" --appimage-extract; \
  test -x /tmp/squashfs-root/AppRun; \
  rm -rf /opt/orcaslicer; mv /tmp/squashfs-root /opt/orcaslicer; \
  rm -f "$f"
RUN chmod -R a+rX /opt/orcaslicer


# Original OrcaSlicer 2.4.2, FOrcaSlicer research build 2.3.2-fos.8.6.8
RUN set -eux; mkdir -p /tmp/bundle; cd /tmp/bundle; \
    curl -fsSL --retry 4 --retry-delay 3 -o app.AppImage https://github.com/OrcaSlicer/OrcaSlicer/releases/download/v2.4.2/OrcaSlicer_Linux_AppImage_Ubuntu2404_V2.4.2.AppImage; \
    echo "d12fb8c8eac1aecd2dfb6377acd48f994f8fa439ed5292fa532dd82880f029fd  app.AppImage" | sha256sum -c -; \
    chmod +x app.AppImage; ./app.AppImage --appimage-extract >extract.log; \
    mv squashfs-root /opt/orcaslicer-original-v2.4.2; chmod -R a+rX /opt/orcaslicer-original-v2.4.2; \
    cd /; rm -rf /tmp/bundle
RUN set -eux; mkdir -p /tmp/bundle; cd /tmp/bundle; \
    curl -fsSL --retry 4 --retry-delay 3 -o app.AppImage https://github.com/jiyang1018/FOrcaSlicer/releases/download/v2.3.2-fos.8.6.8/FOrcaSlicer_Linux_V2.3.2-fos.8.6.8.AppImage; \
    echo "713686b0b9b9101a9cbdb39dd3f57d99b09fde9eafc0da394b5482e7d2471477  app.AppImage" | sha256sum -c -; \
    chmod +x app.AppImage; ./app.AppImage --appimage-extract >extract.log; \
    mv squashfs-root /opt/forcaslicer-v2.3.2-fos.8.6.8; chmod -R a+rX /opt/forcaslicer-v2.3.2-fos.8.6.8; \
    cd /; rm -rf /tmp/bundle
# OpenSCAD Nightly plus BOSL2 pinned to the verified repository revision.
RUN set -eux; mkdir -p /tmp/bundle; cd /tmp/bundle; \
    curl -fsSL --retry 4 --retry-delay 3 -o app.AppImage https://files.openscad.org/snapshots/OpenSCAD-2026.11.01-x86_64.AppImage; \
    echo "42b0dd9ce38025c3a39e96151c0825330829dc6dccf4e277acdc98bb0368116e  app.AppImage" | sha256sum -c -; \
    chmod +x app.AppImage; ./app.AppImage --appimage-extract >extract.log; \
    mv squashfs-root /opt/openscad-nightly-2026.11.01; chmod -R a+rX /opt/openscad-nightly-2026.11.01; \
    git init -q bosl2; git -C bosl2 remote add origin https://github.com/BelfrySCAD/BOSL2.git; \
    git -C bosl2 fetch -q --depth 1 origin 556023bf7e540aae9f44b29bf00dd2ce3b8af02e; \
    git -C bosl2 checkout -q FETCH_HEAD; \
    test "$(git -C bosl2 rev-parse HEAD)" = "556023bf7e540aae9f44b29bf00dd2ce3b8af02e"; \
    rm -rf bosl2/.git; mkdir -p /opt/openscad-libraries; mv bosl2 /opt/openscad-libraries/BOSL2; \
    chmod -R a+rX /opt/openscad-libraries; cd /; rm -rf /tmp/bundle
COPY src/mobile.js /opt/snapmaker-web-ui/snapmaker-mobile.js
COPY src/mobile-index.html /opt/snapmaker-web-ui/index.html
COPY scripts/launch-app /usr/local/bin/orca-web-launch-app
COPY scripts/10-desktop-init /custom-cont-init.d/10-orca-web-desktop
COPY desktop/ /usr/share/applications/
RUN chmod 755 /usr/local/bin/orca-web-launch-app /custom-cont-init.d/10-orca-web-desktop && \
    test -f /opt/openscad-libraries/BOSL2/std.scad && \
    test -x /opt/orcaslicer/AppRun && test -x /opt/orcaslicer-original-v2.4.2/AppRun && \
    test -x /opt/forcaslicer-v2.3.2-fos.8.6.8/AppRun && test -x /opt/openscad-nightly-2026.11.01/AppRun
EXPOSE 3000 3001
