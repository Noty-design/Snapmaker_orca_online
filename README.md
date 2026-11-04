# Orca Online

Run Snapmaker Orca, OrcaSlicer, FOrcaSlicer and OpenSCAD from a browser. The applications run in a Linux container and the desktop is streamed using [Selkies](https://github.com/selkies-project/selkies).

![Snapmaker Orca running in a browser](assets/slicer-desktop.webp)

### Works on desktop and mobile. The toolbar can be moved or minimized as needed.

[![Snapmaker Orca on a phone](assets/mobile-workflow.gif)](assets/mobile-session.mp4)

[Watch the phone recording (MP4)](assets/mobile-session.mp4)

### Touch toolbar

<p align="center">
  <img src="assets/mobile-toolbar.webp" alt="Mobile touch toolbar with pointer, scale, pan, web zoom, right click, upload and function keys" width="700">
</p>

| Control | What it does |
|:---|:---|
| **☰** | Opens the Selkies menu. Hold and drag to move the toolbar. |
| **Mouse Pointer / Direct Touch** | Switches between trackpad-style pointer movement and direct touch. |
| **100% ▾** | Sets the remote display scale (100–300%). |
| **Pan** | Drags the build plate with one finger. |
| **Web Zoom** | Zooms the browser image without changing the slicer's camera. |
| **Right Click** | Sends a right click at the current pointer position. |
| **↑** | Uploads a model from your device. |
| **Fn** | Opens Ctrl, Alt, Shift and other keys. Double-tap a modifier to keep it pressed. |
| **‹** | Collapses or restores the toolbar. |

## Included

| Application | Version |
| --- | --- |
| [Snapmaker Orca](https://github.com/Snapmaker/OrcaSlicer) | 2.4.1 |
| [OrcaSlicer](https://github.com/OrcaSlicer/OrcaSlicer) | 2.4.2 |
| [FOrcaSlicer](https://github.com/jiyang1018/FOrcaSlicer) | 2.3.2-fos.8.6.8 (experimental) |
| [OpenSCAD](https://openscad.org/) + [BOSL2](https://github.com/BelfrySCAD/BOSL2) | 2026.11.01 nightly |

## Install

Works with Podman or Docker Compose. The first build downloads the applications and needs several gigabytes of disk space.

**Podman**

```bash
git clone https://github.com/Noty-design/Snapmaker_orca_online.git
cd Snapmaker_orca_online
./scripts/run-podman.sh
```

**Docker Compose** (from the same project directory)

```bash
docker compose up --build -d
```

Open **https://127.0.0.1:3301** on the host. The default HTTPS certificate is self-signed.

Configuration options are in [`.env.example`](.env.example). Profiles and settings are stored in a persistent volume.

## Security

For remote printer access, use an authenticated connection such as Cloudflare Tunnel with access controls, Tailscale or a VPN. Do not expose the desktop directly to the public internet.

## License

Unofficial community project, not affiliated with the application developers. Original project code and documentation are licensed under [PolyForm Noncommercial 1.0.0](LICENSE) for noncommercial use; third-party programs keep their own licenses. See [THIRD_PARTY.md](THIRD_PARTY.md).
