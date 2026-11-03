# Snapmaker Orca Web — mobile slicer bundle

A reproducible x86_64 self-hosted browser desktop based on Debian 13,
X11/Openbox and LinuxServer Selkies.

Included applications:
- Snapmaker Orca 2.4.1 (default)
- OrcaSlicer original 2.4.2
- FOrcaSlicer experimental Snapmaker U1 fork 2.3.2-fos.8.6.8
- OpenSCAD Nightly 2026.11.01 with BOSL2

Includes our mobile Selkies toolbar: trackpad, scale, right-button Pan,
right click, Fn modifiers, browser zoom, and moveable menu.

## Test locally on an x86_64 Linux machine

Requirements: Podman, several GB of available storage, RAM for 3D slicing,
and internet access for official release downloads.

    git clone https://github.com/Noty-design/Snapmaker_orca_online.git
    cd snapmaker-orca-web
    ./scripts/run-podman.sh

Or run docker compose up --build -d. Both use persistent /config volumes.
The bundled mobile HTML and JavaScript are mounted read-only at runtime, as in the verified installation. The Selkies entrypoint regenerates its default page on startup. The built-in HTTPS certificate is self-signed and suitable for local testing.
The HTTP origin binds to 127.0.0.1 by default and requires a trusted TLS
reverse proxy for remote browser access.

## Public anonymous demo

Our product goal is a public URL that anyone can use without registering.
This source package is NOT the public multi-user service yet. It exposes a
full remote Linux desktop, including terminal and passwordless administrator-rights INSIDE
the container, and cannot safely be offered to unrelated anonymous visitors
as a shared desktop. A public service requires a fresh isolated sandbox
per session; see docs/public-demo.md and SECURITY.md.

No printer configuration, user files, TLS private keys, browser profiles,
or credentials from the author's workstation are included.

## Sources

Third party programs are downloaded from their original release pages with
pinned SHA-256 checksums. They retain their own licenses; see THIRD_PARTY.md.
This is an unofficial integration and not a Snapmaker product.
