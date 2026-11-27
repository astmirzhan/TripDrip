# TripDrip design

The design was made in Figma (team file "ninja-turtles", page TripDrip) and moved into code one to one: sizes, spacing, colors and sprites.

## Idea

A retro pixel-game look: steppe, mountains, yurts and Baiterek. A trip feels like playing through levels: the route is a road with stops, and every stop gives coins. It lowers the stress of being in a foreign country and makes the app easy to remember.

## Colors

Tokens live in `frontend/src/index.css` (the `@theme` block).

| Token | Color | Used for |
|---|---|---|
| `ink` | `#2e1b5b` | text, borders, shadows |
| `ink-soft` | `#5b4a8a` | secondary text |
| `yellow` | `#ffc803` | primary buttons, coins, active items |
| `mist` | `#f3f5ff` | inputs, cards |
| `cream` | `#fff6d6` | highlighted blocks |
| `leaf` | `#4c8c4a` | section labels |
| `grass` / `forest` | `#a6d86a` / `#2f6b45` | ground in the scene |
| `wood` | `#8a5a3b` | coin sign |
| `sea` / `lake` | `#3fb8d0` / `#2a8fb0` | water on the Kazakhstan map |
| `danger` | `#d9452b` | SOS, reports, deletion |

## Fonts

- **Jersey 10**: titles and buttons.
- **Tiny5**: body text. A pixel font where C and O look different, and Cyrillic and Kazakh letters (ә, ғ, қ, ң, ө, ұ, ү, һ, і) keep the same style.

## Components

- **Panel**: white, 4px `ink` border, 16–18px radius, hard 8px shadow with no blur.
- **Button**: 4px border, 6px shadow; on press it moves down 4px like a physical key.
- **Chip**: 3px border, 10px radius, upper-case text; the selected chip is filled with `ink`.
- **Coin and sign** with the balance in the bottom-right corner of the scene.

## Illustrations

Pixel sprites in `frontend/src/assets/figma/`: Baiterek, yurt, mountains, route road, five avatar variants, icons (camera, lock, flag, check, people).

## Map of Kazakhstan

A pixel map with real borders, rivers and lakes, built from Natural Earth open data by `frontend/scripts/make_kz_map.py`. Cities sit at their real coordinates.

## Responsive layout

Every screen works from a 390px phone to a wide desktop: columns stack on phones, the menu wraps onto several rows, and long button labels wrap inside their card.
