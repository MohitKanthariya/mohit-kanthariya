# Mohit Kanthariya — Portfolio

Static site (HTML + CSS + JS, no build step), hosted on GitHub Pages at https://mohitkanthariya.me

## Update content
- Project links: in `index.html`, each project has `<ul class="links">`. Put a URL in an empty `href=""` (e.g. GitHub "Source") and it appears automatically.
- Screenshots: `assets/screens/<app>-1..3.webp`
- Resume: replace `assets/Mohit_Kanthariya_Resume.pdf`
- Contact form opens the visitor's email app (mailto). For a real form backend, use Formspree and point the form `action` at it.

## Hosting
GitHub Pages (branch `main`, root). `CNAME` holds the custom domain. DNS:
- `A` records for `@` → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- `CNAME` for `www` → mohitkanthariya.github.io
