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
  INK,
  roundRect,
  strokeInk,
} from "./paintShared";

const BG = "bg-buffet-3-lantern-v1";

/**
 * BUFFET 3 — Lantern Pavilion
 *
 * Distinct layout:
 *   • Window dining along the TOP (sunset band)
 *   • Curved tray arc in the CENTER courtyard
 *   • Cook line on the WEST wall (vertical workflow)
 *   • Paper lanterns + bamboo posts
 */
const COLLIDERS: Collider[] = [
  { x: 480, y: 16, w: 960, h: 32 },
  { x: 480, y: 524, w: 960, h: 32 },
  { x: 16, y: 270, w: 32, h: 540 },
  { x: 944, y: 270, w: 32, h: 540 },
  { x: 480, y: 100, w: 760, h: 40 },
  { x: 480, y: 265, w: 360, h: 36 },
  { x: 350, y: 300, w: 40, h: 80 },
  { x: 610, y: 300, w: 40, h: 80 },
  { x: 130, y: 320, w: 100, h: 280 },
  { x: 480, y: 380, w: 120, h: 50 },
  { x: 820, y: 300, w: 70, h: 80 },
  { x: 760, y: 400, w: 50, h: 40 },
];

const TRAYS: BuffetTrayDef[] = [
  { id: "chicken", x: 380, y: 265, label: "Chicken", accepts: "chicken_fried", max: 6, addPerStock: 2 },
  { id: "shrimp", x: 430, y: 240, label: "Shrimp", accepts: "shrimp_fried", max: 4, addPerStock: 2 },
  { id: "fries", x: 480, y: 228, label: "Fries", accepts: "fries", max: 10, addPerStock: 5 },
  { id: "tomato", x: 530, y: 240, label: "Tomatoes", accepts: "tomato_grilled", max: 2, addPerStock: 2 },
  { id: "pepper", x: 580, y: 265, label: "Peppers", accepts: "pepper_grilled", max: 2, addPerStock: 2 },
];

const APPLIANCES: ApplianceDef[] = [
  { id: "fryer_a", x: 120, y: 220, kind: "fryer", label: "Fryer" },
  { id: "fryer_b", x: 120, y: 290, kind: "fryer", label: "Fryer" },
  { id: "hold_fryer_l", x: 175, y: 220, kind: "counter", label: "Hold" },
  { id: "hold_fryer_r", x: 175, y: 290, kind: "counter", label: "Hold" },
  { id: "flour_a", x: 120, y: 360, kind: "flour", label: "Flour" },
  { id: "grill_panel_a", x: 120, y: 420, kind: "grill_panel", label: "Pan L" },
  { id: "grill_panel_b", x: 175, y: 420, kind: "grill_panel", label: "Pan R" },
  { id: "sink_a", x: 120, y: 480, kind: "sink", label: "Sink" },
  { id: "plates", x: 760, y: 400, kind: "plates", label: "Plates", dispenses: "plate" },
  { id: "trash_a", x: 820, y: 360, kind: "trash", label: "Trash" },
  { id: "juice_a", x: 820, y: 280, kind: "juice", label: "Juice", dispenses: "juice" },
  { id: "prep_a", x: 440, y: 380, kind: "prep", label: "Chop" },
  { id: "prep_b", x: 520, y: 380, kind: "prep", label: "Chop" },
  { id: "pantry_chicken", x: 60, y: 470, kind: "pantry", label: "Chicken", dispenses: "chicken_raw" },
  { id: "pantry_shrimp", x: 60, y: 400, kind: "pantry", label: "Shrimp", dispenses: "shrimp_raw" },
  { id: "pantry_fries", x: 60, y: 330, kind: "pantry", label: "Raw fries", dispenses: "fries_raw" },
  { id: "pantry_tomato", x: 820, y: 470, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
  { id: "pantry_pepper", x: 880, y: 470, kind: "pantry", label: "Peppers", dispenses: "pepper" },
];

const SEATS: CustomerSeat[] = [
  { id: 0, x: 160, y: 135 },
  { id: 1, x: 250, y: 128 },
  { id: 2, x: 340, y: 122 },
  { id: 3, x: 430, y: 120 },
  { id: 4, x: 520, y: 120 },
  { id: 5, x: 610, y: 122 },
  { id: 6, x: 700, y: 128 },
  { id: 7, x: 790, y: 135 },
];

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = color;
  roundRect(ctx, x - 10, y, 20, 24, 4, true);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  roundRect(ctx, x - 6, y + 4, 12, 10, 2, true);
  const glow = ctx.createRadialGradient(x, y + 12, 2, x, y + 12, 28);
  glow.addColorStop(0, `${color}55`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + 12, 28, 0, Math.PI * 2);
  ctx.fill();
}

function drawBambooPost(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.fillStyle = "#558b2f";
  roundRect(ctx, x, y, 10, h, 3, true);
  ctx.fillStyle = "#7cb342";
  roundRect(ctx, x + 1, y + 1, 8, h - 2, 2, true);
  for (let i = 0; i < h; i += 22) {
    ctx.fillStyle = "#33691e";
    ctx.fillRect(x, y + i, 10, 3);
  }
}

function paint(scene: Phaser.Scene) {
  ensureCanvas(scene, BG, MAP_W, MAP_H, (ctx) => {
    drawWoodFloor(ctx, 0, 0, MAP_W, MAP_H, "#d7ccc8");

    const sunset = ctx.createLinearGradient(0, 0, 0, 80);
    sunset.addColorStop(0, "#ff8a65");
    sunset.addColorStop(0.5, "#ffb74d");
    sunset.addColorStop(1, "#ffe0b2");
    ctx.fillStyle = sunset;
    ctx.fillRect(0, 0, MAP_W, 80);
    drawBanner(ctx, "LANTERN PAVILION", "#e65100", "sunset window · courtyard trays");

    for (const lx of [120, 280, 440, 600, 760]) drawLantern(ctx, lx, 72, "#ff7043");
    drawBambooPost(ctx, 40, 100, 400);
    drawBambooPost(ctx, 910, 100, 400);

    // Top dining counter
    ctx.fillStyle = "#5d4037";
    roundRect(ctx, 100, 70, 760, 55, 12, true);
    ctx.fillStyle = "#8d6e63";
    roundRect(ctx, 108, 76, 744, 28, 8, true);
    strokeInk(ctx, 4);
    roundRect(ctx, 100, 70, 760, 55, 12, false);
    for (const s of SEATS) drawPlaceSetting(ctx, s.x, 82);

    // Curved tray courtyard
    ctx.fillStyle = "#eceff1";
    roundRect(ctx, 320, 200, 360, 55, 16, true);
    roundRect(ctx, 310, 210, 50, 120, 12, true);
    roundRect(ctx, 640, 210, 50, 120, 12, true);
    ctx.strokeStyle = "rgba(230,81,0,0.5)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(480, 280, 180, 50, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    strokeInk(ctx, 3);
    roundRect(ctx, 320, 200, 360, 55, 16, false);
    for (const t of TRAYS) drawBuffetTraySlot(ctx, t.x, t.y);

    // West cook column
    drawSteelCounter(ctx, 55, 180, 110, 320);
    drawPotatoCrate(ctx, 50, 300);
    drawShrimpBowl(ctx, 50, 370);
    drawChickenCrate(ctx, 50, 440);
    drawFryer(ctx, 70, 195);
    drawFryer(ctx, 70, 265);
    drawFlourBowl(ctx, 65, 335);
    drawGrill(ctx, 60, 395);
    drawSink(ctx, 65, 455);

    // Center prep
    drawSteelCounter(ctx, 410, 350, 160, 55);
    drawCuttingBoard(ctx, 420, 358);
    drawCuttingBoard(ctx, 500, 358);

    drawPlateStack(ctx, 730, 370);
    drawTomatoCrate(ctx, 790, 432);
    drawPepperCrate(ctx, 850, 430);
    drawJuiceMachine(ctx, 785, 250);
    drawTrash(ctx, 785, 330);
    drawDoor(ctx, 40, 42);

    strokeInk(ctx, 6);
    roundRect(ctx, 6, 6, MAP_W - 12, MAP_H - 12, 16, false);
  });
}

export const BUFFET_3: MapDef = {
  id: "buffet-3",
  env: "buffet",
  mode: "buffet",
  name: "Lantern Pavilion",
  slot: 3,
  unlocked: true,
  matchSeconds: 320,
  customerSpawnMs: [5500, 8000],
  spawn: { x: 480, y: 400 },
  door: { x: 70, y: 55 },
  menu: [],
  plateStock: 9,
  colliders: COLLIDERS,
  appliances: APPLIANCES,
  seats: SEATS,
  buffetTrays: TRAYS,
  bgKey: BG,
  paint,
};
