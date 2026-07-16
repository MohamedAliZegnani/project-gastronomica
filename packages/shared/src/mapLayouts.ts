/** Data-only map layouts for server-authoritative co-op (no Phaser). */

export type AuthMapId =
  | "diner-1"
  | "diner-2"
  | "diner-3"
  | "diner-4"
  | "beach-1"
  | "mall-1"
  | "buffet-1";
export type AuthGameMode = "classic" | "buffet";

export type AuthCollider = { x: number; y: number; w: number; h: number };
export type AuthSeat = { id: number; x: number; y: number };
export type AuthAppliance = {
  id: string;
  x: number;
  y: number;
  kind: string;
  label: string;
  dispenses?: string;
};

export type AuthBuffetTray = {
  id: string;
  x: number;
  y: number;
  label: string;
  accepts: string;
  max: number;
  addPerStock: number;
};

export type AuthMapLayout = {
  id: AuthMapId;
  mode: AuthGameMode;
  name: string;
  matchSeconds: number;
  customerSpawnMs: [number, number];
  spawn: { x: number; y: number };
  door: { x: number; y: number };
  menu: string[];
  plateStock: number;
  colliders: AuthCollider[];
  appliances: AuthAppliance[];
  seats: AuthSeat[];
  buffetTrays?: AuthBuffetTray[];
};

const DINER_1: AuthMapLayout = {
  id: "diner-1",
  mode: "classic",
  name: "Morning Rush",
  matchSeconds: 210,
  customerSpawnMs: [4200, 6400],
  spawn: { x: 400, y: 280 },
  door: { x: 668, y: 500 },
  menu: ["pizza", "salad", "fries_meal"],
  plateStock: 7,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 160, y: 120, w: 200, h: 70 },
    { x: 150, y: 230, w: 180, h: 55 },
    { x: 150, y: 340, w: 180, h: 55 },
    { x: 200, y: 450, w: 320, h: 50 },
    { x: 360, y: 200, w: 50, h: 120 },
    { x: 560, y: 200, w: 40, h: 28 },
    { x: 720, y: 200, w: 40, h: 28 },
    { x: 560, y: 320, w: 40, h: 28 },
    { x: 720, y: 320, w: 40, h: 28 },
  ],
  appliances: [
    { id: "oven_a", x: 140, y: 175, kind: "oven", label: "Oven" },
    { id: "grill_a", x: 220, y: 175, kind: "grill", label: "Grill" },
    { id: "trash_a", x: 290, y: 175, kind: "trash", label: "Trash" },
    { id: "prep_a", x: 140, y: 280, kind: "prep", label: "Chop" },
    { id: "sink_a", x: 220, y: 280, kind: "sink", label: "Sink" },
    { id: "fryer_a", x: 180, y: 390, kind: "fryer", label: "Fryer" },
    { id: "hold_fryer_l", x: 95, y: 340, kind: "counter", label: "Hold" },
    { id: "hold_fryer_r", x: 255, y: 340, kind: "counter", label: "Hold" },
    { id: "pass_a", x: 340, y: 250, kind: "pass", label: "Pass · hold" },
    { id: "pantry_tomato", x: 80, y: 448, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_cheese", x: 145, y: 448, kind: "pantry", label: "Mozzarella", dispenses: "lettuce" },
    { id: "pantry_potato", x: 210, y: 448, kind: "pantry", label: "Potatoes", dispenses: "potato" },
    { id: "pantry_dough", x: 275, y: 448, kind: "pantry", label: "Dough", dispenses: "pizza_dough" },
    { id: "plates", x: 350, y: 448, kind: "plates", label: "Plates", dispenses: "plate" },
  ],
  seats: [
    { id: 0, x: 520, y: 205 },
    { id: 1, x: 760, y: 205 },
    { id: 2, x: 520, y: 325 },
    { id: 3, x: 760, y: 325 },
  ],
};

/** Same menu/stations as Morning Rush — remodeled circular kitchen + 5 seats. */
const DINER_2: AuthMapLayout = {
  id: "diner-2",
  mode: "classic",
  name: "Cozy Lunch",
  matchSeconds: 210,
  customerSpawnMs: [4200, 6400],
  spawn: { x: 230, y: 300 },
  door: { x: 655, y: 500 },
  menu: ["pizza", "salad", "fries_meal"],
  plateStock: 7,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 160, y: 90, w: 200, h: 55 },
    { x: 66, y: 255, w: 48, h: 160 },
    { x: 300, y: 222, w: 52, h: 148 },
    { x: 195, y: 430, w: 195, h: 38 },
    { x: 48, y: 448, w: 40, h: 40 },
    { x: 385, y: 228, w: 48, h: 120 },
    { x: 520, y: 160, w: 42, h: 30 },
    { x: 790, y: 175, w: 42, h: 30 },
    { x: 655, y: 285, w: 42, h: 30 },
    { x: 505, y: 395, w: 42, h: 30 },
    { x: 770, y: 405, w: 42, h: 30 },
  ],
  appliances: [
    { id: "oven_a", x: 100, y: 140, kind: "oven", label: "Oven" },
    { id: "grill_a", x: 205, y: 140, kind: "grill", label: "Grill" },
    { id: "pantry_tomato", x: 102, y: 195, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_cheese", x: 102, y: 245, kind: "pantry", label: "Mozzarella", dispenses: "lettuce" },
    { id: "pantry_potato", x: 102, y: 295, kind: "pantry", label: "Potatoes", dispenses: "potato" },
    { id: "pantry_dough", x: 102, y: 340, kind: "pantry", label: "Dough", dispenses: "pizza_dough" },
    { id: "prep_a", x: 255, y: 180, kind: "prep", label: "Chop" },
    { id: "sink_a", x: 255, y: 258, kind: "sink", label: "Sink" },
    { id: "fryer_a", x: 148, y: 378, kind: "fryer", label: "Fryer" },
    { id: "plates", x: 247, y: 378, kind: "plates", label: "Plates", dispenses: "plate" },
    { id: "trash_a", x: 78, y: 415, kind: "trash", label: "Trash" },
    { id: "pass_a", x: 385, y: 228, kind: "pass", label: "Pass · hold" },
  ],
  seats: [
    { id: 0, x: 480, y: 165 },
    { id: 1, x: 830, y: 180 },
    { id: 2, x: 655, y: 290 },
    { id: 3, x: 465, y: 400 },
    { id: 4, x: 810, y: 410 },
  ],
};

/** Same menu/stations — classic front-counter diner + lounge dining. */
const DINER_3: AuthMapLayout = {
  id: "diner-3",
  mode: "classic",
  name: "Evening Service",
  matchSeconds: 210,
  customerSpawnMs: [4200, 6400],
  spawn: { x: 260, y: 170 },
  door: { x: 510, y: 500 },
  menu: ["pizza", "salad", "fries_meal"],
  plateStock: 7,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 140, y: 90, w: 180, h: 52 },
    { x: 320, y: 90, w: 150, h: 52 },
    { x: 460, y: 90, w: 110, h: 52 },
    { x: 545, y: 85, w: 42, h: 40 },
    { x: 230, y: 263, w: 380, h: 48 },
    { x: 260, y: 348, w: 420, h: 44 },
    { x: 145, y: 405, w: 78, h: 48 },
    { x: 310, y: 405, w: 78, h: 48 },
    { x: 620, y: 195, w: 56, h: 56 },
    { x: 800, y: 280, w: 78, h: 48 },
    { x: 640, y: 400, w: 56, h: 56 },
  ],
  appliances: [
    { id: "oven_a", x: 90, y: 130, kind: "oven", label: "Oven" },
    { id: "grill_a", x: 175, y: 130, kind: "grill", label: "Grill" },
    { id: "prep_a", x: 270, y: 130, kind: "prep", label: "Chop" },
    { id: "sink_a", x: 350, y: 130, kind: "sink", label: "Sink" },
    { id: "fryer_a", x: 450, y: 130, kind: "fryer", label: "Fryer" },
    { id: "trash_a", x: 545, y: 125, kind: "trash", label: "Trash" },
    { id: "pantry_tomato", x: 70, y: 212, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_cheese", x: 145, y: 212, kind: "pantry", label: "Mozzarella", dispenses: "lettuce" },
    { id: "pantry_potato", x: 220, y: 212, kind: "pantry", label: "Potatoes", dispenses: "potato" },
    { id: "pantry_dough", x: 295, y: 212, kind: "pantry", label: "Dough", dispenses: "pizza_dough" },
    { id: "plates", x: 380, y: 212, kind: "plates", label: "Plates", dispenses: "plate" },
    { id: "hold_plates", x: 435, y: 212, kind: "counter", label: "Hold" },
    { id: "pass_a", x: 260, y: 348, kind: "pass", label: "Pass · hold" },
  ],
  seats: [
    { id: 0, x: 145, y: 410 },
    { id: 1, x: 310, y: 410 },
    { id: 2, x: 620, y: 200 },
    { id: 3, x: 800, y: 285 },
    { id: 4, x: 640, y: 405 },
  ],
};

const DINER_4: AuthMapLayout = {
  id: "diner-4",
  mode: "classic",
  name: "Last Call",
  matchSeconds: 210,
  customerSpawnMs: [4200, 6400],
  spawn: { x: 720, y: 360 },
  door: { x: 100, y: 500 },
  menu: ["pizza", "salad", "fries_meal"],
  plateStock: 7,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 735, y: 97, w: 365, h: 50 },
    { x: 735, y: 245, w: 260, h: 46 },
    { x: 735, y: 397, w: 260, h: 50 },
    { x: 500, y: 270, w: 48, h: 240 },
    { x: 130, y: 165, w: 78, h: 48 },
    { x: 300, y: 165, w: 78, h: 48 },
    { x: 130, y: 330, w: 56, h: 56 },
    { x: 300, y: 330, w: 56, h: 56 },
    { x: 210, y: 450, w: 78, h: 48 },
  ],
  appliances: [
    { id: "prep_a", x: 584, y: 140, kind: "prep", label: "Chop" },
    { id: "sink_a", x: 665, y: 140, kind: "sink", label: "Sink" },
    { id: "oven_a", x: 759, y: 140, kind: "oven", label: "Oven" },
    { id: "grill_a", x: 859, y: 140, kind: "grill", label: "Grill" },
    { id: "pantry_tomato", x: 638, y: 290, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_cheese", x: 708, y: 290, kind: "pantry", label: "Mozzarella", dispenses: "lettuce" },
    { id: "pantry_potato", x: 778, y: 290, kind: "pantry", label: "Potatoes", dispenses: "potato" },
    { id: "pantry_dough", x: 848, y: 290, kind: "pantry", label: "Dough", dispenses: "pizza_dough" },
    { id: "trash_a", x: 635, y: 450, kind: "trash", label: "Trash" },
    { id: "hold_plates", x: 686, y: 450, kind: "counter", label: "Hold" },
    { id: "plates", x: 737, y: 450, kind: "plates", label: "Plates", dispenses: "plate" },
    { id: "fryer_a", x: 816, y: 450, kind: "fryer", label: "Fryer" },
    { id: "pass_a", x: 500, y: 270, kind: "pass", label: "Pass · hold" },
  ],
  seats: [
    { id: 0, x: 130, y: 170 },
    { id: 1, x: 300, y: 170 },
    { id: 2, x: 130, y: 335 },
    { id: 3, x: 300, y: 335 },
    { id: 4, x: 210, y: 455 },
  ],
};

const BEACH_1: AuthMapLayout = {
  id: "beach-1",
  mode: "classic",
  name: "Sunset Grill",
  matchSeconds: 235,
  customerSpawnMs: [3800, 5800],
  spawn: { x: 480, y: 380 },
  door: { x: 728, y: 500 },
  menu: ["pizza", "salad", "fries_meal", "burger", "juice"],
  plateStock: 7,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 480, y: 115, w: 700, h: 60 },
    { x: 100, y: 250, w: 100, h: 50 },
    { x: 860, y: 250, w: 100, h: 50 },
    { x: 300, y: 460, w: 480, h: 45 },
    { x: 280, y: 320, w: 40, h: 28 },
    { x: 420, y: 320, w: 40, h: 28 },
    { x: 560, y: 320, w: 40, h: 28 },
    { x: 700, y: 320, w: 40, h: 28 },
  ],
  appliances: [
    { id: "oven_a", x: 200, y: 170, kind: "oven", label: "Oven" },
    { id: "grill_a", x: 320, y: 170, kind: "grill", label: "Grill" },
    { id: "trash_a", x: 380, y: 170, kind: "trash", label: "Trash" },
    { id: "prep_a", x: 460, y: 170, kind: "prep", label: "Chop" },
    { id: "sink_a", x: 560, y: 170, kind: "sink", label: "Sink" },
    { id: "fryer_a", x: 680, y: 170, kind: "fryer", label: "Fryer" },
    { id: "pass_a", x: 800, y: 170, kind: "pass", label: "Pass · hold" },
    { id: "hold_bar_l", x: 620, y: 210, kind: "counter", label: "Hold" },
    { id: "hold_bar_r", x: 740, y: 210, kind: "counter", label: "Hold" },
    { id: "juice_a", x: 100, y: 300, kind: "juice", label: "Juice", dispenses: "juice" },
    { id: "pantry_tomato", x: 100, y: 458, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_cheese", x: 165, y: 458, kind: "pantry", label: "Mozzarella", dispenses: "lettuce" },
    { id: "pantry_bun", x: 230, y: 458, kind: "pantry", label: "Buns", dispenses: "bun" },
    { id: "pantry_patty", x: 295, y: 458, kind: "pantry", label: "Patties", dispenses: "patty_raw" },
    { id: "pantry_potato", x: 360, y: 458, kind: "pantry", label: "Potatoes", dispenses: "potato" },
    { id: "pantry_dough", x: 425, y: 458, kind: "pantry", label: "Dough", dispenses: "pizza_dough" },
    { id: "plates", x: 510, y: 458, kind: "plates", label: "Plates", dispenses: "plate" },
  ],
  seats: [
    { id: 0, x: 250, y: 325 },
    { id: 1, x: 390, y: 325 },
    { id: 2, x: 530, y: 325 },
    { id: 3, x: 670, y: 325 },
  ],
};

const MALL_1: AuthMapLayout = {
  id: "mall-1",
  mode: "classic",
  name: "Food Court Frenzy",
  matchSeconds: 255,
  customerSpawnMs: [3200, 4800],
  spawn: { x: 480, y: 360 },
  door: { x: 480, y: 90 },
  menu: ["pizza", "salad", "fries_meal", "burger", "juice", "ice_cream"],
  plateStock: 7,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 480, y: 220, w: 320, h: 140 },
    { x: 480, y: 420, w: 220, h: 55 },
    { x: 160, y: 180, w: 40, h: 28 },
    { x: 160, y: 300, w: 40, h: 28 },
    { x: 800, y: 180, w: 40, h: 28 },
    { x: 800, y: 300, w: 40, h: 28 },
  ],
  appliances: [
    { id: "oven_a", x: 380, y: 200, kind: "oven", label: "Oven" },
    { id: "grill_a", x: 480, y: 200, kind: "grill", label: "Grill" },
    { id: "trash_a", x: 300, y: 200, kind: "trash", label: "Trash" },
    { id: "prep_a", x: 580, y: 200, kind: "prep", label: "Chop" },
    { id: "sink_a", x: 380, y: 280, kind: "sink", label: "Sink" },
    { id: "fryer_a", x: 480, y: 280, kind: "fryer", label: "Fryer" },
    { id: "pass_a", x: 580, y: 280, kind: "pass", label: "Pass · hold" },
    { id: "hold_island_l", x: 420, y: 320, kind: "counter", label: "Hold" },
    { id: "hold_island_r", x: 540, y: 320, kind: "counter", label: "Hold" },
    { id: "juice_a", x: 400, y: 470, kind: "juice", label: "Juice", dispenses: "juice" },
    { id: "icecream_a", x: 500, y: 470, kind: "icecream", label: "Ice cream", dispenses: "ice_cream" },
    { id: "pantry_tomato", x: 80, y: 448, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_cheese", x: 145, y: 448, kind: "pantry", label: "Mozzarella", dispenses: "lettuce" },
    { id: "pantry_bun", x: 210, y: 448, kind: "pantry", label: "Buns", dispenses: "bun" },
    { id: "pantry_patty", x: 275, y: 448, kind: "pantry", label: "Patties", dispenses: "patty_raw" },
    { id: "pantry_potato", x: 680, y: 448, kind: "pantry", label: "Potatoes", dispenses: "potato" },
    { id: "pantry_dough", x: 745, y: 448, kind: "pantry", label: "Dough", dispenses: "pizza_dough" },
    { id: "plates", x: 820, y: 448, kind: "plates", label: "Plates", dispenses: "plate" },
  ],
  seats: [
    { id: 0, x: 130, y: 185 },
    { id: 1, x: 130, y: 305 },
    { id: 2, x: 830, y: 185 },
    { id: 3, x: 830, y: 305 },
  ],
};

const BUFFET_1: AuthMapLayout = {
  id: "buffet-1",
  mode: "buffet",
  name: "Harbor Buffet",
  matchSeconds: 320,
  customerSpawnMs: [5500, 8000],
  spawn: { x: 480, y: 380 },
  door: { x: 900, y: 220 },
  menu: [],
  plateStock: 9,
  colliders: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 524, w: 960, h: 32 },
    { x: 16, y: 270, w: 32, h: 540 },
    { x: 944, y: 270, w: 32, h: 540 },
    { x: 480, y: 100, w: 760, h: 40 },
    { x: 480, y: 250, w: 420, h: 36 },
    { x: 300, y: 290, w: 40, h: 100 },
    { x: 660, y: 290, w: 40, h: 100 },
    { x: 480, y: 340, w: 120, h: 50 },
    { x: 480, y: 455, w: 720, h: 50 },
    { x: 90, y: 300, w: 70, h: 80 },
    { x: 760, y: 400, w: 50, h: 40 },
  ],
  appliances: [
    { id: "fryer_a", x: 220, y: 470, kind: "fryer", label: "Fryer" },
    { id: "fryer_b", x: 320, y: 470, kind: "fryer", label: "Fryer" },
    { id: "hold_fryer_l", x: 220, y: 410, kind: "counter", label: "Hold" },
    { id: "hold_fryer_r", x: 320, y: 410, kind: "counter", label: "Hold" },
    { id: "flour_a", x: 400, y: 470, kind: "flour", label: "Flour" },
    { id: "grill_panel_a", x: 520, y: 455, kind: "grill_panel", label: "Pan L" },
    { id: "grill_panel_b", x: 575, y: 455, kind: "grill_panel", label: "Pan R" },
    { id: "sink_a", x: 680, y: 470, kind: "sink", label: "Sink" },
    { id: "plates", x: 760, y: 400, kind: "plates", label: "Plates", dispenses: "plate" },
    { id: "trash_a", x: 90, y: 360, kind: "trash", label: "Trash" },
    { id: "juice_a", x: 90, y: 280, kind: "juice", label: "Juice", dispenses: "juice" },
    { id: "prep_a", x: 440, y: 340, kind: "prep", label: "Chop" },
    { id: "prep_b", x: 520, y: 340, kind: "prep", label: "Chop" },
    { id: "pantry_chicken", x: 80, y: 470, kind: "pantry", label: "Chicken", dispenses: "chicken_raw" },
    { id: "pantry_shrimp", x: 140, y: 470, kind: "pantry", label: "Shrimp", dispenses: "shrimp_raw" },
    { id: "pantry_fries", x: 160, y: 400, kind: "pantry", label: "Raw fries", dispenses: "fries_raw" },
    { id: "pantry_tomato", x: 820, y: 470, kind: "pantry", label: "Tomatoes", dispenses: "tomato" },
    { id: "pantry_pepper", x: 880, y: 470, kind: "pantry", label: "Peppers", dispenses: "pepper" },
  ],
  seats: [
    { id: 0, x: 160, y: 135 },
    { id: 1, x: 250, y: 128 },
    { id: 2, x: 340, y: 122 },
    { id: 3, x: 430, y: 120 },
    { id: 4, x: 520, y: 120 },
    { id: 5, x: 610, y: 122 },
    { id: 6, x: 700, y: 128 },
    { id: 7, x: 790, y: 135 },
  ],
  buffetTrays: [
    { id: "chicken", x: 360, y: 248, label: "Chicken", accepts: "chicken_fried", max: 6, addPerStock: 2 },
    { id: "shrimp", x: 430, y: 248, label: "Shrimp", accepts: "shrimp_fried", max: 4, addPerStock: 2 },
    { id: "fries", x: 500, y: 248, label: "Fries", accepts: "fries", max: 10, addPerStock: 5 },
    { id: "tomato", x: 570, y: 248, label: "Tomatoes", accepts: "tomato_grilled", max: 2, addPerStock: 2 },
    { id: "pepper", x: 640, y: 248, label: "Peppers", accepts: "pepper_grilled", max: 2, addPerStock: 2 },
  ],
};

const LAYOUTS: Record<AuthMapId, AuthMapLayout> = {
  "diner-1": DINER_1,
  "diner-2": DINER_2,
  "diner-3": DINER_3,
  "diner-4": DINER_4,
  "beach-1": BEACH_1,
  "mall-1": MALL_1,
  "buffet-1": BUFFET_1,
};

export function isAuthMapId(id: string): id is AuthMapId {
  return id in LAYOUTS;
}

export function getMapLayout(mapId: string): AuthMapLayout {
  if (isAuthMapId(mapId)) return LAYOUTS[mapId];
  return DINER_1;
}

export const AUTH_MAP_IDS = Object.keys(LAYOUTS) as AuthMapId[];
