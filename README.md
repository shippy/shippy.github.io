# Astro Starter Kit: Blog

This personal website - currently based on the Astro `blog` template - contains a blog, side-project list, presentation list, `/now` page, and a few other pages.

It is deployed via Github Actions to Github Pages, which in turn is DNS-redirected to [my personal domain](https://simon.podhajsky.net/).

## Contributing (notes to self)

- Everything is in `src/` and `public/` (but should be in `src/`)
- `src/pages/` has the rendering details for the raw content, which is in `src/content/`.
- Add images mostly in `**/images/` folders, but also potentially in `src/assets` if they're to be directly imported.