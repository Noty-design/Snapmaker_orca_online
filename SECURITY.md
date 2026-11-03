# Security and operation

This package provides a shared graphical Linux session, not a secure
multi-user app. The LinuxServer Selkies desktop has a terminal and administrator-rights.
Never expose this container directly to anonymous internet visitors.

- Default published ports bind to loopback.
- Terminate TLS at an authenticated reverse proxy for personal remote use.
- Never mount private host folders or container engine sockets.
- Public demos need per-visitor disposable isolated sandboxes (ideally
  microVMs), strict limits and no access to internal networks or other users.
- Limit the number of sessions and their lifetime; destroy storage on exit.
- Do not commit sensitive files, certificates, auth tokens or printer IPs.
- No multi-user ingress is included in this repository.
