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

const BG = "bg-buffet-5-loft-v1";

/**
 * BUFFET 5 — Market Loft
 *
 * Distinct layout:
 *   • Mezzanine dining TOP-LEFT (8 seats)
 *   • Conveyor-style tray belt along the EAST wall
 *   • Open kitchen BOTTOM-LEFT corner
 *   • Exposed brick, warm lamps, industrial rails
 */
const COLLIDERS: Collider[] = [
  { x: 480, y: 16, w: 960, h: 32 },
  { x: 480, y: 524, w: 960, h: 32 },
  { x: 16, y: 270, w: 32, h: 540 },
  { x: 944, y: 270, w: 32, h: 540 },
  { x: 220, y: 130, w: 320, h: 44 },
  { x: 780, y: 280, w: 100, h: 260 },
  { x: 280, y: 420, w: 360, h: 120 },
  { x: 480, y: 300, w: 120, h: 50 },
  { x: 680, y: 400, w: 50, h: 40 },
  { x: 90, y: 300, w: 70, h: 80 },
];

const TRAYS: BuffetTrayDef[] = [
  { id: "chicken", x: 780, y: 200, label: "Chicken", accepts: "chicken_fried", max: 6, addPerStock: 2 },
  { id: "shrimp", x: 780, y: 260, label: "Shrimp", accepts: "shrimp_fried", max: 4, addPerStock: 2 },
  { id: "fries", x: 780, y: 320, label: "Fries", accepts: "fries", max: 10, addPerStock: 5 },
  { id: "tomato", x: 780, y: 380, label: "Tomatoes", accepts: "tomato_grilled", max: 2, addPerStock: 2 },
  { id: "pepper", x: 780, y: 440, label: "Peppers", accepts: "pepper_grilled", max: 2, addPerStock: 2 },
];

const APPLIANCES: ApplianceDef[] = [
  { id: "fryer_a", x: 120, y: 470, kind: "fryer", label: "Fryer" },
  { id: "fryer_b", x: 220, y: 470, kind: "fryer", label: "Fryer" },
  { id: "hold_fryer_l", x: 120, y: 410, kind: "counter", label: "Hold" },
  { id: "hold_fryer_r", x: 220, y: 410, kind: "counter", label: "Hold" },
  { id: "flour_a", x: 320, y: 470, kind: "flour", label: "Flour" },
  { id: "grill_panel_a", x: 320, y: 410, kind: "grill_panel", label: "Pan L" },
  { id: "grill_panel_b", x: 380, y: 410, kind: "grill_panel", label: "Pan R" },
  { id: "sink_a", x: 320, y: 480, kind: "sink", label: "Sink" },
  { id: "plates", x: 680, y: 400, kind: "plates", label: "Plates", dispenses: "plate" },
  { id: "trash_a", x: 90, y: 360, kind: "trash", label: "Trash" },
  { id: "juice_a", x: 90, y: 280, kind: "juice", label: "Juice", dispenses: "juice" },
  { id: "prep_a", x: 440, y: 300, kind: "prep", label: "Chop" },
  { id: "prep_b", x: 520, y: 300, kind: "prep", label: "Chop" },
  { id: "pantry_chicken", x: 60, y: 470, kind: "pantry", label: "Chicken", dispenses: "chicken_raw" },
  { id: "pantry_shrimp", x: 60, y: 400, kind: "pantry", label: "Shrimp", dispenses: "shrimp_raw" },
  { id: "pantry_fries", x: 140, y: 470, kind: "pantry", label: "Raw fries", dispenses: "fries_raw" },
  { id: "pantry_tomato", x: 440, y: 470, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
  { id: "pantry_pepper", x: 500, y: 470, kind: "pantry", label: "Peppers", dispenses: "pepper" },
];

const SEATS: CustomerSeat[] = [
  { id: 0, x: 100, y: 130 },
  { id: 1, x: 180, y: 130 },
  { id: 2, x: 260, y: 130 },
  { id: 3, x: 340, y: 130 },
  { id: 4, x: 100, y: 200 },
  { id: 5, x: 180, y: 200 },
  { id: 6, x: 260, y: 200 },
  { id: 7, x: 340, y: 200 },
];

function drawBrickWall(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y += 18) {
    for (let x = 0; x < MAP_W; x += 36) {
      const off = (y / 18) % 2 === 0 ? 0 : 18;
      ctx.fillStyle = (x + y) % 72 === 0 ? "#6d4c41" : "#5d4037";
      ctx.fillRect(x + off, y, 34, 16);
    }
  }
}

function drawPipeRail(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.strokeStyle = "#78909c";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = "#cfd8dc";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawHangingLamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 30);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = "#ff8f00";
  roundRect(ctx, x - 12, y, 24, 16, 4, true);
  const glow = ctx.createRadialGradient(x, y + 8, 4, x, y + 8, 50);
  glow.addColorStop(0, "rgba(255,183,77,0.4)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + 8, 50, 0, Math.PI * 2);
  ctx.fill();
}

function paint(scene: Phaser.Scene) {
  ensureCanvas(scene, BG, MAP_W, MAP_H, (ctx) => {
    drawBrickWall(ctx);
    drawWoodFloor(ctx, 60, 60, 840, 460, "#8d6e63");

    drawBanner(ctx, "MARKET LOFT", "#455a64", "mezzanine · conveyor belt");
    drawPipeRail(ctx, 720, 80, 720, 480);
    for (const lx of [180, 360, 540]) drawHangingLamp(ctx, lx, 100);

    // Mezzanine dining top-left
    ctx.fillStyle = "#37474f";
    roundRect(ctx, 60, 100, 320, 120, 10, true);
    ctx.fillStyle = "#546e7a";
    roundRect(ctx, 68, 108, 304, 104, 8, true);
    strokeInk(ctx, 3);
    roundRect(ctx, 60, 100, 320, 120, 10, false);
    for (const s of SEATS) drawPlaceSetting(ctx, s.x, s.y - 6);

    // East conveyor belt + trays
    ctx.fillStyle = "#455a64";
    roundRect(ctx, 720, 160, 90, 320, 8, true);
    ctx.fillStyle = "#607d8b";
    for (let y = 170; y < 470; y += 28) {
      ctx.fillRect(728, y, 74, 8);
    }
    ctx.fillStyle = "#ffc107";
    ctx.fillRect(720, 160, 6, 320);
    ctx.fillRect(804, 160, 6, 320);
    for (const t of TRAYS) drawBuffetTraySlot(ctx, t.x, t.y);

    // Open kitchen bottom-left
    drawSteelCounter(ctx, 55, 380, 380, 130);
    drawChickenCrate(ctx, 50, 430);
    drawShrimpBowl(ctx, 50, 370);
    drawPotatoCrate(ctx, 110, 430);
    drawFryer(ctx, 90, 420);
    drawFryer(ctx, 190, 420);
    drawFlourBowl(ctx, 290, 430);
    drawGrill(ctx, 340, 380);
    drawSink(ctx, 290, 480);

    // Center prep bridge
    drawSteelCounter(ctx, 410, 270, 160, 55);
    drawCuttingBoard(ctx, 420, 278);
    drawCuttingBoard(ctx, 500, 278);
    drawTomatoCrate(ctx, 420, 430);
    drawPepperCrate(ctx, 480, 430);

    drawPlateStack(ctx, 650, 370);
    drawJuiceMachine(ctx, 55, 250);
    drawTrash(ctx, 55, 330);
    drawDoor(ctx, 870, 480);

    strokeInk(ctx, 6);
    roundRect(ctx, 6, 6, MAP_W - 12, MAP_H - 12, 16, false);
  });
}

export const BUFFET_5: MapDef = {
  id: "buffet-5",
  env: "buffet",
  mode: "buffet",
  name: "Market Loft",
  slot: 5,
  unlocked: true,
  matchSeconds: 320,
  customerSpawnMs: [5500, 8000],
  spawn: { x: 480, y: 360 },
  door: { x: 900, y: 490 },
  menu: [],
  plateStock: 9,
  colliders: COLLIDERS,
  appliances: APPLIANCES,
  seats: SEATS,
  buffetTrays: TRAYS,
  bgKey: BG,
  paint,
};
