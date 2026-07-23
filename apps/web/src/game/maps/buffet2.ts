import type Phaser from "phaser";
import type { ApplianceDef } from "../items/types";
import type { CustomerSeat } from "../entities/Customer";
import type { BuffetTrayDef, Collider, MapDef } from "./types";
import { MAP_H, MAP_W } from "./types";
import {
  drawBanner,
  drawBuffetTraySlot,
  drawChickenCrate,
  drawFlourBowl,
  drawPepperCrate,
  drawPlaceSetting,
  drawShrimpBowl,
} from "./buffetShared";
import {
  drawCuttingBoard,
  drawDoor,
  drawFryer,
  drawGrill,
  drawJuiceMachine,
  drawPlateStack,
  drawPotatoCrate,
  drawSink,
  drawSteelCounter,
  drawTomatoCrate,
  drawTrash,
  drawWoodFloor,
  ensureCanvas,
  roundRect,
  strokeInk,
} from "./paintShared";

const BG = "bg-buffet-2-garden-v9";

/**
 * BUFFET 2 — Garden Terrace (L-kitchen)
 *
 *   • Prep table above the tray rail
 *   • Horizontal tray rail (buffet)
 *   • Horizontal cook rail along the BOTTOM-LEFT (faces north into plaza)
 *   • Booth dining BOTTOM-RIGHT
 */
const COLLIDERS: Collider[] = [
  { x: 480, y: 16, w: 960, h: 32 },
  { x: 480, y: 524, w: 960, h: 32 },
  { x: 16, y: 270, w: 32, h: 540 },
  { x: 944, y: 270, w: 32, h: 540 },
  // Prep table above buffet
  { x: 500, y: 95, w: 180, h: 45 },
  // Tray rail
  { x: 500, y: 175, w: 460, h: 42 },
  // Bottom cook rail (horizontal)
  { x: 300, y: 455, w: 480, h: 55 },
  // SE booth dining
  { x: 740, y: 400, w: 260, h: 150 },
  // Juice / trash mid-right
  { x: 880, y: 250, w: 70, h: 100 },
  // Plates stand
  { x: 500, y: 400, w: 50, h: 40 },
];

const TRAYS: BuffetTrayDef[] = [
  { id: "chicken", x: 340, y: 175, label: "Chicken", accepts: "chicken_fried", max: 6, addPerStock: 2 },
  { id: "shrimp", x: 420, y: 175, label: "Shrimp", accepts: "shrimp_fried", max: 4, addPerStock: 2 },
  { id: "fries", x: 500, y: 175, label: "Fries", accepts: "fries", max: 10, addPerStock: 5 },
  { id: "tomato", x: 580, y: 175, label: "Tomatoes", accepts: "tomato_grilled", max: 2, addPerStock: 2 },
  { id: "pepper", x: 660, y: 175, label: "Peppers", accepts: "pepper_grilled", max: 2, addPerStock: 2 },
];

const APPLIANCES: ApplianceDef[] = [
  // Bottom cook rail — west → east, facing north
  { id: "pantry_chicken", x: 90, y: 470, kind: "pantry", label: "Chicken", dispenses: "chicken_raw" },
  { id: "pantry_shrimp", x: 150, y: 470, kind: "pantry", label: "Shrimp", dispenses: "shrimp_raw" },
  { id: "pantry_fries", x: 200, y: 410, kind: "pantry", label: "Raw fries", dispenses: "fries_raw" },
  { id: "fryer_a", x: 250, y: 470, kind: "fryer", label: "Fryer" },
  { id: "fryer_b", x: 310, y: 470, kind: "fryer", label: "Fryer" },
  { id: "hold_fryer_l", x: 250, y: 410, kind: "counter", label: "Hold" },
  { id: "hold_fryer_r", x: 310, y: 410, kind: "counter", label: "Hold" },
  { id: "flour_a", x: 370, y: 470, kind: "flour", label: "Flour" },
  { id: "grill_panel_a", x: 430, y: 455, kind: "grill_panel", label: "Pan L" },
  { id: "grill_panel_b", x: 465, y: 455, kind: "grill_panel", label: "Pan R" },
  { id: "prep_a", x: 450, y: 95, kind: "prep", label: "Chop" },
  { id: "prep_b", x: 520, y: 95, kind: "prep", label: "Chop" },
  { id: "sink_a", x: 520, y: 470, kind: "sink", label: "Sink" },
  { id: "plates", x: 500, y: 400, kind: "plates", label: "Plates", dispenses: "plate" },
  { id: "pantry_tomato", x: 570, y: 470, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
  { id: "pantry_pepper", x: 570, y: 410, kind: "pantry", label: "Peppers", dispenses: "pepper" },
  // Service near SE booths
  { id: "juice_a", x: 880, y: 230, kind: "juice", label: "Juice", dispenses: "juice" },
  { id: "trash_a", x: 880, y: 310, kind: "trash", label: "Trash" },
];

const SEATS: CustomerSeat[] = [
  { id: 0, x: 640, y: 360 },
  { id: 1, x: 720, y: 360 },
  { id: 2, x: 800, y: 360 },
  { id: 3, x: 880, y: 360 },
  { id: 4, x: 640, y: 440 },
  { id: 5, x: 720, y: 440 },
  { id: 6, x: 800, y: 440 },
  { id: 7, x: 880, y: 440 },
];

function drawIvyTrellis(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.fillStyle = "#5d4037";
  for (let i = 0; i < h; i += 28) {
    ctx.fillRect(x, y + i, 6, 22);
    ctx.fillRect(x + 18, y + i + 10, 6, 22);
  }
  ctx.strokeStyle = "#2e7d32";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(x + 12, y + 20 + i * 45, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(76,175,80,0.35)";
    ctx.fill();
  }
}

function drawFlowerPot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = "#6d4c41";
  roundRect(ctx, x, y + 14, 22, 16, 3, true);
  ctx.fillStyle = color;
  for (const [px, py] of [
    [6, 8],
    [14, 6],
    [10, 12],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + px, y + py, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paint(scene: Phaser.Scene) {
  ensureCanvas(scene, BG, MAP_W, MAP_H, (ctx) => {
    drawWoodFloor(ctx, 0, 0, MAP_W, MAP_H, "#b8c9a0");

    const sky = ctx.createLinearGradient(0, 0, 0, 70);
    sky.addColorStop(0, "#81c784");
    sky.addColorStop(1, "#c8e6c9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, MAP_W, 70);
    drawBanner(ctx, "GARDEN TERRACE", "#00897b", "L-kitchen · booth plaza");

    drawIvyTrellis(ctx, 28, 80, 280);
    drawFlowerPot(ctx, 250, 55, "#e91e63");
    drawFlowerPot(ctx, 720, 55, "#ff9800");
    drawFlowerPot(ctx, 420, 250, "#9c27b0");

    // Prep table — above the buffet
    drawSteelCounter(ctx, 410, 70, 180, 50);
    drawCuttingBoard(ctx, 420, 78);
    drawCuttingBoard(ctx, 490, 78);
    drawPotatoCrate(ctx, 360, 72);

    // Buffet tray rail (below prep)
    ctx.fillStyle = "#eceff1";
    roundRect(ctx, 280, 145, 440, 58, 14, true);
    ctx.fillStyle = "#00897b";
    ctx.fillRect(280, 193, 440, 4);
    strokeInk(ctx, 3);
    roundRect(ctx, 280, 145, 440, 58, 14, false);
    for (const t of TRAYS) drawBuffetTraySlot(ctx, t.x, t.y);

    // Bottom cook rail — horizontal, faces north into plaza
    drawSteelCounter(ctx, 60, 420, 540, 70);
    drawChickenCrate(ctx, 70, 432);
    drawShrimpBowl(ctx, 130, 432);
    drawFryer(ctx, 185, 400);
    drawFryer(ctx, 245, 400);
    drawFlourBowl(ctx, 340, 430);
    drawGrill(ctx, 400, 400);
    drawSink(ctx, 490, 425);
    drawPlateStack(ctx, 475, 370);
    drawTomatoCrate(ctx, 540, 432);
    drawPepperCrate(ctx, 540, 370);

    // SE booth dining
    ctx.fillStyle = "#6d4c41";
    roundRect(ctx, 620, 320, 280, 180, 14, true);
    ctx.fillStyle = "#a1887f";
    roundRect(ctx, 628, 328, 264, 164, 10, true);
    strokeInk(ctx, 4);
    roundRect(ctx, 620, 320, 280, 180, 14, false);
    for (const s of SEATS) drawPlaceSetting(ctx, s.x, s.y - 12);

    drawJuiceMachine(ctx, 845, 200);
    drawTrash(ctx, 845, 280);
    drawDoor(ctx, 870, 42);

    strokeInk(ctx, 6);
    roundRect(ctx, 6, 6, MAP_W - 12, MAP_H - 12, 16, false);
  });
}

export const BUFFET_2: MapDef = {
  id: "buffet-2",
  env: "buffet",
  mode: "buffet",
  name: "Garden Terrace",
  slot: 2,
  unlocked: true,
  matchSeconds: 320,
  customerSpawnMs: [5500, 8000],
  spawn: { x: 380, y: 280 },
  door: { x: 900, y: 55 },
  menu: [],
  plateStock: 9,
  colliders: COLLIDERS,
  appliances: APPLIANCES,
  seats: SEATS,
  buffetTrays: TRAYS,
  bgKey: BG,
  paint,
};
