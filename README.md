# Mystery Pool

Roll a random [PortSwigger Mystery Lab](https://portswigger.net/web-security/mystery-lab-challenge),
but only from a pool of topics you choose.

**Unofficial companion. Not affiliated with PortSwigger.**

## Why this exists

The Mystery Lab Challenge offers two extremes: one category, or `Any` — all twenty of them.
There is no middle setting, and the middle is the useful one while you're learning:
*roll me something random, but only from the topics I've actually studied.*

The reason that setting doesn't exist is visible in the client. The "Challenge me" button is a
widget loaded at runtime (`POST /api/widgets` → `/bundles/widgets/mysterylab.js`), and its
`updateUrl()` builds the href from two single `<select>` elements:

```js
const f = t.find("select.category")[0].selectedOptions[0].value,
      e = t.find("select.level")[0].selectedOptions[0].value,
      o = t.getElementsByClassName("referrer")[0].value;
r = "/academy/labs/launchMystery?".concat("categoryId=", f)
     .concat("&level=", e).concat("&referrer=", o);
```

`selectedOptions[0].value` — a single value, no `multiple` attribute. "More than one category"
isn't blocked in that code, it simply doesn't exist as a concept. And `categoryId=2,3` is not
something the client can produce, so there's no reason to expect the server to parse it either.

But the launch endpoint takes a scalar `categoryId`. So pick the category from a subset yourself
and pass one id — exactly what the server already handles. That's all this page does.

## How the login works (it doesn't need handling)

PortSwigger's session cookie is:

```
set-cookie: SessionId=...; max-age=43200; domain=.portswigger.net;
            path=/; secure; samesite=lax; httponly
```

`SameSite=Lax` means the cookie **is** sent on cross-site top-level GET navigations. Clicking a
plain link from this page to `portswigger.net/academy/labs/launchMystery?...` arrives with your
session attached by the browser. This site handles no authentication, sees no credentials, and
makes no requests to portswigger.net at all — the topic list below is committed to the repo.

Three consequences:

- It has to be a real navigation (anchor click or `window.open`). A `fetch` would be cross-origin
  with no CORS, and `Lax` wouldn't attach the cookie to a subresource request anyway.
- The cookie is `HttpOnly` and cross-origin, so this page cannot tell whether you're logged in or
  which labs you've finished. The `onlyCompleted` parameter is therefore never sent.
- Not logged in? The redirect to `/users` preserves the whole launch URL in `returnurl`, so after
  logging in you land on the lab that was rolled. The session lasts 12 hours, so this happens often.

## Keeping the mystery

The launch URL contains `categoryId`, so putting it on screen would tell you the topic before you
start — which is the one thing a mystery lab exists to withhold. So the page shows neither the URL
nor the category: it just opens the lab. The topic is available behind a collapsed *Reveal the
topic* toggle, for after you've solved it or given up.

The URL you actually end up on (after PortSwigger's redirect) cannot be displayed here either, and
not by choice: the endpoint sends no `Access-Control-Allow-Origin` header, so a cross-origin
`fetch` gets an opaque response with an empty `url` and an unreadable `Location`, and reading
`location.href` off a `window.open` handle throws cross-origin. Only code running on PortSwigger's
own origin — a bookmarklet, a userscript, an extension — can see it. Once the tab opens, though,
that URL is right there in the address bar.

## What it can't do

- It rolls a **topic**, not a lab. PortSwigger picks the actual lab inside the category, so the
  same lab can come up twice and there's no way to know in advance which one you'll get.
- The roll is uniform across topics, not across labs: a category with 3 labs is as likely as one
  with 12.
- It can't skip labs you've already completed.

## Running it

No build, no dependencies, no server. Every path is relative and the topic data is a plain
`<script>` rather than a `fetch`, so the page works opened straight from disk, served at a domain
root, or served under a sub-path like `/mystery-pool/` — all the same.

```bash
xdg-open index.html            # or just double-click it
python3 -m http.server 8000    # if you'd rather have a server
```

Deployed with GitHub Pages: *Settings → Pages → Deploy from a branch → `main` / `(root)`.*

## Topics

| id | category | levels |
|----|----------|--------|
| 1 | SQL injection | Practitioner |
| 2 | Cross-site scripting | Apprentice, Practitioner, Expert |
| 3 | Cross-site request forgery (CSRF) | Apprentice, Practitioner |
| 5 | DOM-based vulnerabilities | Practitioner, Expert |
| 6 | Cross-origin resource sharing (CORS) | Apprentice, Practitioner |
| 7 | XML external entity (XXE) injection | Apprentice, Practitioner, Expert |
| 8 | Server-side request forgery (SSRF) | Apprentice, Practitioner, Expert |
| 9 | HTTP request smuggling | Practitioner, Expert |
| 11 | Server-side template injection | Practitioner |
| 12 | Path traversal | Apprentice, Practitioner |
| 13 | Access control vulnerabilities | Apprentice |
| 14 | Authentication | Apprentice, Practitioner |
| 16 | Web cache poisoning | Practitioner, Expert |
| 17 | Insecure deserialization | Apprentice, Practitioner, Expert |
| 18 | Information disclosure | Apprentice, Practitioner |
| 19 | Business logic vulnerabilities | Apprentice, Practitioner, Expert |
| 20 | HTTP Host header attacks | Apprentice, Practitioner, Expert |
| 21 | OAuth authentication | Practitioner, Expert |
| 22 | File upload vulnerabilities | Apprentice, Practitioner |
| 23 | JWT | Apprentice, Practitioner, Expert |

Levels map to `level=0` (Apprentice), `1` (Practitioner), `2` (Expert), `-1` (Any). Ids 4, 10 and
15 are not exposed by the widget.

## Refreshing the topic list

`data/categories.js` is maintained by hand. The widget endpoint answers unauthenticated, so one
request regenerates the `categories` array:

```bash
curl -s -X POST "https://portswigger.net/api/widgets" \
  -H "Content-Type: application/json" \
  -H "Widget-Source: /web-security/mystery-lab-challenge" \
  -d '[{"widgetId":"academy-launch-mystery-lab","additionalData":{"widget-button-text":"Challenge me"}}]' \
| python3 -c '
import json, re, sys
html = json.load(sys.stdin)[0]["Html"]
rows = re.findall(r"<option availablelevels=\"([^\"]*)\" availablecompletedlevels=\"[^\"]*\"\s*(?:selected )?value=\"(-?\d+)\">([^<]+)</option>", html)
cats = [{"id": int(v), "name": n.strip(), "levels": sorted(int(x) for x in lv.split(",") if x)}
        for lv, v, n in rows if v != "-1"]
print(json.dumps(sorted(cats, key=lambda c: c["id"]), indent=2))
'
```

Paste the result as the `categories` array inside `data/categories.js` and bump `fetched`. The
file is one assignment wrapping the same JSON, so the payload stays valid JSON. The `availablecompletedlevels`
attribute is per-account, which is why it isn't stored here.

## License

MIT. PortSwigger, Burp Suite and Web Security Academy are trademarks of PortSwigger Ltd; this
project is not affiliated with or endorsed by them.
