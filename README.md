# 燈與芽：回家的潮汐 · Lantern Duet

An original, complete eight-island HTML5 cooperative puzzle adventure for two people sharing one keyboard.

**Play:** https://zuestrd20.github.io/lantern-duet-adventure/

## A light, a seed, and a way home

The tide has scattered the path home. A lantern spirit lights ancient mechanisms; a seed guardian grows bridges and moves fruit-stone crates. You need each other to wake the islands, sail the paper ferry, change the moon gates, and bring the final lighthouse back to life.

All characters, story, layouts, canvas artwork and synthesized music are original. The broad inspiration is cooperative adventures with complementary abilities and changing mechanics. No assets, characters, story, music or level layouts from *It Takes Two* are used.

## Controls

| Player / action | Keys |
| --- | --- |
| 燈燈 / lantern spirit | W A S D; E to interact or rescue |
| 芽芽 / seed guardian | Arrow keys; Enter to interact or rescue |
| Pause / resume | Space; use the dialog's resume button |
| Progressive hints | H |
| Retry checkpoint | R; confirmation lets you retry checkpoint or restart island |

A physical desktop keyboard is required. This is local shared-keyboard co-op, not network multiplayer. No gamepad or touchscreen control is provided. Hardware keyboard rollover varies: if your keyboard drops simultaneous presses, release one direction briefly or use a keyboard with better multi-key support.

## Journey

1. **甦醒的草岸:** learn reciprocal light/root pressure plates.
2. **果核工坊:** leave crates as counterweights while helping your partner.
3. **雙橋潮汐:** trade temporary pressure for permanent bridges.
4. **紙船渡口:** sail together, then solve the far-shore orchard.
5. **月相庭院:** coordinate reversible northern and southern gates.
6. **迷霧書庫:** recover from mist, rescue each other, preserve checkpoints.
7. **極光接力塔:** link three towers into a crossing.
8. **回家的潮汐:** combine your skills and return home together.

**Pacing target:** approximately 30 minutes for a first-time pair, allowing time to read, discuss, explore and use hints. This is a design estimate, not a measured two-human completion time. Experienced players following a solution will finish faster. There are no forced waiting timers or artificial time gates.

Interact within one cardinal tile of a matching heart-stone. Gold and green plates accept only their matching character. Plain plates also accept crates. Both players may share a floor tile. Downed partners need the other character nearby to revive them. If both fall, or a crate is stuck, checkpoint retry and full island restart remain available.

Complete every required heart-stone and bring **both** players within one cardinal tile of the sail exit. Both roles are mandatory; one inactive character cannot complete the campaign.

## Saving, privacy and accessibility

- Current island progress is saved locally in this browser. Reloading starts that island again.
- In-island Moonstone checkpoints save both players and puzzle mechanisms only for the current session.
- No accounts, analytics, backend, tracking, external fonts or external assets.
- Music is opt-in and synthesized by Web Audio. Muting stops active sound; pause/blur stops music.
- Reduced-motion support follows system preference and can be toggled.
- Traditional Chinese instructions, progressive hints, keyboard-focus outlines, native modal dialogs and textual status feedback.
- Small-screen layout is responsive, but gameplay is designed for desktop shared-keyboard use. Canvas play is visual; it is not a fully nonvisual screen-reader game.

## Development

No build step or dependencies.

```sh
npm test
npm run serve
```

Serve the repository through an HTTP server (ES modules do not work reliably with `file://`). GitHub Pages publishes the repository root on `main`; no custom workflow or additional authorization scopes are needed.

`engine.js` is deterministic and separate from rendering/input. `levels.js` defines the campaign. `renderer.js` is original canvas illustration. `input.js`, `storage.js`, and `audio.js` handle independent browser-facing concerns. See `SOLUTIONS.md` for spoiler-marked legal walkthroughs and `QA.md` for the verification record.
