# ep_embedmedia_tweaks

Forked from etherpad plugin [ep_embedmedia](https://github.com/JohnMcLear/ep_embedmedia).

This version provides:
* Altered HTML sanitization
* Adjusted UI/UX for the Embed dialog and toolbar button.
* Additional domain handling for YouTube links (change to YT no-cookie)
* Implemented collectContentPre hook for style persistence on edited lines

Original code © 2020 John McLear and other contributors, licensed under the Apache-2.0 license.
Modifications © 2025 Daniel Castelone, released under the same Apache-2.0 license. See `LICENSE.md` and `NOTICE.md` for full details.

## Install

```bash
cd etherpad-lite
pnpm run plugins i ep_embedmedia_tweaks
```

Or install via the admin menu

## Usage

Insert iframe embeds from the toolbar video icon.

• Direct URL paste is supported **only** for YouTube and Vimeo (they are converted to privacy-enhanced embeds).
• For any other provider, paste the full `<iframe>` embed code – any HTTP/HTTPS domain is allowed and sanitized (scripts stripped, sandbox applied).

YouTube links are automatically redirected to the `youtube-nocookie.com` domain for better privacy.

## Contributing

Issues and PRs are welcome! Please open them on the GitHub repository listed in `package.json`.

---
This project contains code derived from Google Caja's HTML sanitizer (Apache-2.0).
