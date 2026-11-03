# Anonymous public demo: launch requirements

Goal: a public HTTPS URL with no user signup. Anonymous user experience
is compatible with strong isolation behind the scenes.

Do not route multiple untrusted users into one Selkies container.
Per user: fresh disposable microVM or comparably hardened sandbox, private
temporary storage, no host binds, no privileges beyond required graphical
tools, no access to cloud metadata or internal networks, CPU/RAM/disk quotas,
maximum upload size and 15-30 minute expiration. Rate-limit new sessions,
cap concurrency and make the client reconnect to the same session.

The public gateway and sandbox orchestration are not implemented in this
bundle. Do not advertise a public demo until those exist and pass testing.
