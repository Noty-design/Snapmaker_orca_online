# Free-hosting investigation — 2026-11-03

Providers below may change their quotas and conditions.
Official provider references:
https://www.koyeb.com/docs/reference/instances
https://render.com/docs/compute-plans
https://huggingface.co/docs/hub/spaces-overview
https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
https://cloud.google.com/run/pricing
https://developers.cloudflare.com/containers/platform/pricing/

Koyeb Free: 0.1 vCPU, 512 MB; too small for GUI slicers.
Render Free: 0.1 CPU, 512 MB; too small and spins down.
Hugging Face Docker Spaces: CPU Basic is 2 vCPU/16 GB and zero
hourly cost, but creating new Docker Spaces requires a paid plan.
Oracle Always Free Ampere A1: 2 ARM OCPU, 12 GB; our AppImages are
x86_64. AMD free Micro is too small.
Google Cloud Run: usage-limited free tier and billing; WebSockets
are subject to request duration limits; no session isolation built-in.
Cloudflare Containers: Workers Paid subscription required.
GitHub Pages: free for static documentation, not server-side slicing.

Verdict: No verified zero-cost, continuous, x86_64 multi-user hosting
for this container. We can publish source for free and prototype on
a limited CPU host, but do not imply a public free service exists yet.
