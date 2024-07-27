# My Personal Website

This personal website - originally based on the Astro starter `blog` template, then re-tooled using ThemeFisher's [Andromeda theme](https://themefisher.com/products/andromeda-astro) - contains a blog, a side-project list, a presentation list, a `/now` page, a `/uses` page, and a `/job-search` page for recruiters.

It is deployed via Github Actions to Github Pages, which in turn is DNS-redirected to [my personal domain](https://simon.podhajsky.net/).

## Contributing (notes to self)

- Everything is in `src/` and `public/` (but should be in `src/`)
- `src/pages/` has the rendering details for the raw content, which is in `src/content/`.
- Add images mostly in `**/images/` folders, but also potentially in `src/assets` if they're to be directly imported.