# Ready, Set, Cook

Co-op kitchen game for **DuoArcade** — no login on the game itself.

## Run the kitchen

```bash
cd C:\Users\zegna\project-gastronomica
npm run dev
```

- Play: http://localhost:5174  
- Embed (iframe): http://localhost:5174/embed  

## Run DuoArcade with this game

```bash
cd C:\Users\zegna\Downloads\DuoArcade-main\DuoArcade-main
npm run dev
```

Open the duo shelf → **Ready, Set, Cook**.  
The engine loads `http://localhost:5174/embed` in an iframe.

To point at a deployed kitchen, set in the browser console before play:

```js
window.__RSC_EMBED_URL__ = "https://your-kitchen-host/embed";
```

## Look

Bright cartoon kitchen: checker floors, wood counters, glowing stoves, chibi chefs with toques, colorful customers — Ready Set Cook / Overcooked vibe.
