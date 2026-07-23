# Chrome Web Store materials

This directory contains release-adjacent materials that are not packaged with
the extension:

- `listing.md` — canonical Store copy, permission justifications, disclosures,
  and reviewer instructions;
- `demo/` — fictional, politically neutral content used only for screenshots;
- `assets/promo/` — editable SVG sources and rendered Store promotional tiles;
- `assets/screenshots/` — real extension UI screenshots captured for a specific
  release.

Run `npm run check:store-assets` to validate required files and promotional
image dimensions. Store screenshots must show the real extension UI and must
not contain API keys, personal browser information, or real articles.
