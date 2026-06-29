# TODO

Items deferred from code review — address before going to a wider audience.

---

## Server / Deployment

### Hardcoded CLIENT_ORIGIN URL
**File:** `render.yaml` line 10
**Rule violated:** CLAUDE.md — "Never hardcode: URLs"

`CLIENT_ORIGIN` is set as a literal value in `render.yaml`:
```yaml
- key: CLIENT_ORIGIN
  value: https://legendofultima.workwithcyrose.dev
```

If the frontend domain changes, CORS will silently reject all Socket.io and browser connections without a build error.

**Fix:** Change to `sync: false` so the value is managed in the Render dashboard instead of source control:
```yaml
- key: CLIENT_ORIGIN
  sync: false
```
Then set the actual URL in the Render service's Environment tab.
