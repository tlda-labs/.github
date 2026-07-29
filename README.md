# tlda marks

This repository contains the tlda-labs organization profile and the source
geometry used to build marks for labs projects.

## Generate a mark

A project mark keeps the lower half of the tlda semicolon and replaces its
tittle. The tittle is cut by a mask made from the same lower comma, rotated
180 degrees around its bulb center, with the unchanged bulb removed.

Prepare an SVG containing only the paths that should become the tittle. Then
run the generator with four design choices: the tittle's center, its bounding
box, and the color of the base mark.

```sh
npm install
node scripts/build-mark.mjs \
  --tittle assets/tittles/reveal-boxes.svg \
  --center 16,10 \
  --box 10,9 \
  --base-color '#D53F8C' \
  --output profile/assets/quarto-tlda-revealjs
```

The command writes an SVG source, a 512-pixel upload image, and a 40-pixel
proof. Adjust only `--center` and `--box` until both raster sizes read
correctly. Do not redraw the mask: the shared rotated-comma construction is the
point of the system.

The Reveal boxes in `assets/tittles/reveal-boxes.svg` come from the
[Reveal.js logo](https://static.slid.es/reveal/logo-v1/reveal-white-text.svg).
