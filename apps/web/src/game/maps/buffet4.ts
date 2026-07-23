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

const BG = "bg-buffet-4-banquet-v1";

/**
 * BUFFET 4 — Grand Banquet
 *
 * Distinct layout:
 *   • Elevated STAGE with tray line at the TOP
 *   • Long banquet tables along the BOTTOM
 *   • Cook kitchen tucked mid-left
 *   • Chandelier, red carpet, gold pillars
 */
const COLLIDERS: Collider[] = [
  { x: 480, y: 16, w: 960, h: 32 },
  { x: 480, y: 524, w: 960, h: 32 },
  { x: 16, y: 270, w: 32, h: 540 },
  { x: 944, y: 270, w: 32, h: 540 },
  { x: 480, y: 175, w: 560, h: 44 },
  { x: 480, y: 460, w: 760, h: 44 },
  { x: 200, y: 380, w: 280, h: 120 },
  { x: 480, y: 320, w: 120, h: 50 },
  { x: 90, y: 300, w: 70, h: 80 },
  { x: 760, y: 400, w: 50, h: 40 },
];

const TRAYS: BuffetTrayDef[] = [
  { id: "chicken", x: 280, y: 175, label: "Chicken", accepts: "chicken_fried", max: 6, addPerStock: 2 },
  { id: "shrimp", x: 360, y: 175, label: "Shrimp", accepts: "shrimp_fried", max: 4, addPerStock: 2 },
  { id: "fries", x: 440, y: 175, label: "Fries", accepts: "fries", max: 10, addPerStock: 5 },
  { id: "tomato", x: 520, y: 175, label: "Tomatoes", accepts: "tomato_grilled", max: 2, addPerStock: 2 },
  { id: "pepper", x: 600, y: 175, label: "Peppers", accepts: "pepper_grilled", max: 2, addPerStock: 2 },
];

const APPLIANCES: ApplianceDef[] = [
  { id: "fryer_a", x: 120, y: 400, kind: "fryer", label: "Fryer" },
  { id: "fryer_b", x: 200, y: 400, kind: "fryer", label: "Fryer" },
  { id: "hold_fryer_l", x: 120, y: 340, kind: "counter", label: "Hold" },
  { id: "hold_fryer_r", x: 200, y: 340, kind: "counter", label: "Hold" },
  { id: "flour_a", x: 280, y: 400, kind: "flour", label: "Flour" },
  { id: "grill_panel_a", x: 280, y: 340, kind: "grill_panel", label: "Pan L" },
  { id: "grill_panel_b", x: 340, y: 340, kind: "grill_panel", label: "Pan R" },
  { id: "sink_a", x: 280, y: 460, kind: "sink", label: "Sink" },
  { id: "plates", x: 760, y: 400, kind: "plates", label: "Plates", dispenses: "plate" },
  { id: "trash_a", x: 90, y: 360, kind: "trash", label: "Trash" },
  { id: "juice_a", x: 90, y: 280, kind: "juice", label: "Juice", dispenses: "juice" },
  { id: "prep_a", x: 440, y: 320, kind: "prep", label: "Chop" },
  { id: "prep_b", x: 520, y: 320, kind: "prep", label: "Chop" },
  { id: "pantry_chicken", x: 60, y: 470, kind: "pantry", label: "Chicken", dispenses: "chicken_raw" },
  { id: "pantry_shrimp", x: 60, y: 400, kind: "pantry", label: "Shrimp", dispenses: "shrimp_raw" },
  { id: "pantry_fries", x: 140, y: 470, kind: "pantry", label: "Raw fries", dispenses: "fries_raw" },
  { id: "pantry_tomato", x: 820, y: 470, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
  { id: "pantry_pepper", x: 880, y: 470, kind: "pantry", label: "Peppers", dispenses: "pepper" },
];

const SEATS: CustomerSeat[] = [
  { id: 0, x: 180, y: 470 },
  { id: 1, x: 280, y: 470 },
  { id: 2, x: 380, y: 470 },
  { id: 3, x: 480, y: 470 },
  { id: 4, x: 580, y: 470 },
  { id: 5, x: 680, y: 470 },
  { id: 6, x: 780, y: 470 },
  { id: 7, x: 860, y: 470 },
];

function drawChandelier(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = "#ffd54f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 40);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.fillStyle = "#ffc107";
  for (const dx of [-40, -20, 0, 20, 40]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy);
    ctx.lineTo(cx + dx - 8, cy + 18);
    ctx.lineTo(cx + dx + 8, cy + 18);
    ctx.closePath();
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(cx, cy + 10, 10, cx, cy + 10, 120);
  glow.addColorStop(0, "rgba(255,236,179,0.35)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy + 10, 120, 0, Math.PI * 2);
  ctx.fill();
}

function drawGoldPillar(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const g = ctx.createLinearGradient(x, y, x + 16, y);
  g.addColorStop(0, "#b8860b");
  g.addColorStop(0.5, "#ffd54f");
  g.addColorStop(1, "#b8860b");
  ctx.fillStyle = g;
  roundRect(ctx, x, y, 16, h, 4, true);
  ctx.fillStyle = "#fff8e1";
  roundRect(ctx, x + 3, y + 8, 10, h - 16, 2, true);
}

function paint(scene: Phaser.Scene) {
  ensureCanvas(scene, BG, MAP_W, MAP_H, (ctx) => {
    drawWoodFloor(ctx, 0, 0, MAP_W, MAP_H, "#5d4037");

    // Red carpet runner
    ctx.fillStyle = "#b71c1c";
    roundRect(ctx, 280, 0, 400, MAP_H, 0, true);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let y = 0; y < MAP_H; y += 40) {
      ctx.fillRect(280, y, 400, 2);
    }

    drawBanner(ctx, "GRAND BANQUET", "#b71c1c", "stage service · long tables");
    drawChandelier(ctx, 480, 90);
    drawGoldPillar(ctx, 250, 120, 380);
    drawGoldPillar(ctx, 694, 120, 380);

    // Stage tray line
    ctx.fillStyle = "#37474f";
    roundRect(ctx, 200, 145, 560, 60, 10, true);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(200, 195, 560, 4);
    strokeInk(ctx, 3);
    roundRect(ctx, 200, 145, 560, 60, 10, false);
    for (const t of TRAYS) drawBuffetTraySlot(ctx, t.x, t.y);

    // Kitchen block mid-left
    drawSteelCounter(ctx, 55, 300, 290, 180);
    drawChickenCrate(ctx, 50, 430);
    drawShrimpBowl(ctx, 50, 370);
    drawPotatoCrate(ctx, 110, 430);
    drawFryer(ctx, 90, 360);
    drawFryer(ctx, 170, 360);
    drawFlourBowl(ctx, 250, 370);
    drawGrill(ctx, 300, 310);
    drawSink(ctx, 250, 430);

    // Prep between stage and kitchen
    drawSteelCounter(ctx, 410, 290, 160, 55);
    drawCuttingBoard(ctx, 420, 298);
    drawCuttingBoard(ctx, 500, 298);

    // Bottom banquet tables
    ctx.fillStyle = "#4e342e";
    roundRect(ctx, 100, 430, 760, 60, 12, true);
    ctx.fillStyle = "#8d6e63";
    roundRect(ctx, 108, 436, 744, 28, 8, true);
    strokeInk(ctx, 4);
    roundRect(ctx, 100, 430, 760, 60, 12, false);
    for (const s of SEATS) drawPlaceSetting(ctx, s.x, 448);

    drawPlateStack(ctx, 730, 370);
    drawTomatoCrate(ctx, 790, 432);
    drawPepperCrate(ctx, 850, 430);
    drawJuiceMachine(ctx, 55, 250);
    drawTrash(ctx, 55, 330);
    drawDoor(ctx, 870, 42);

    strokeInk(ctx, 6);
    roundRect(ctx, 6, 6, MAP_W - 12, MAP_H - 12, 16, false);
  });
}

export const BUFFET_4: MapDef = {
  id: "buffet-4",
  env: "buffet",
  mode: "buffet",
  name: "Grand Banquet",
  slot: 4,
  unlocked: true,
  matchSeconds: 320,
  customerSpawnMs: [5500, 8000],
  spawn: { x: 480, y: 360 },
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
