# DIA — Environment Variables Setup

## Required Variables

Set these in your hosting platform's environment/settings panel:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key from Supabase dashboard>
```

---

## Where to set them

### Netlify
1. Go to Site → Site configuration → Environment variables
2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
3. Trigger a new deploy (Deploy → Trigger deploy → Deploy site)

### Vercel
1. Go to Project → Settings → Environment Variables
2. Add both variables for Production, Preview, and Development
3. Redeploy from the Deployments tab

### Render
1. Go to your Web Service → Environment
2. Add both variables
3. Manual deploy or push to trigger rebuild

---

## SPA Routing Fix

### Netlify
The file `public/_redirects` is already included. Netlify picks it up automatically.
No extra configuration needed.

### Vercel
The file `vercel.json` is already included. Vercel uses it automatically.
No extra configuration needed.

### Other hosts (cPanel, Apache, Nginx)
Add this to your `.htaccess` (Apache):
```
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Or for Nginx, add to your server block:
```
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## After setting env vars

Always run a fresh build before deploying:
```bash
npm run build
```

The built `dist/` folder is what gets deployed.
