import type {
  AuthCollider,
  AuthMapLayout,
  AuthSeat,
  KitchenInput,
  KitchenSnapshot,
  NetAppliance,
  NetCustomer,
  NetItem,
  NetPlayer,
  NetProcess,
} from "@gastronomica/shared";
import { getMapLayout, tryHandCombine } from "@gastronomica/shared";

const MAP_W = 960;
const MAP_H = 540;
const PLAYER_SPEED = 140;
const PLAYER_SPRINT = 210;
const COOK_MS = 3500;
const CHOP_MS = 1200;
const WASH_MS = 1000;
const PIZZA_COOK_MS = 7500;
const PIZZA_BURN_MS = 15000;
const BURN_MS = 12000;
const APPLIANCE_RANGE = 56;
const PANTRY_RANGE = 100;
const PASS_RANGE = 110;
const CUSTOMER_RANGE = 70;
const PICKUP_RANGE = 48;

const PASS_OFFSETS = [
  { x: -18, y: -8 },
  { x: 0, y: -14 },
  { x: 18, y: -8 },
] as const;

type Facing = "down" | "left" | "right" | "up";

type Item = {
  uid: string;
  id: string;
  x: number;
  y: number;
  contents: string[];
};

type Appliance = {
  id: string;
  x: number;
  y: number;
  kind: string;
  label: string;
  dispenses?: string;
  items: Item[];
  process: NetProcess;
  plateStock: number;
};

type Customer = {
  seatId: number;
  seatX: number;
  seatY: number;
  x: number;
  y: number;
  phase: NetCustomer["phase"];
  orderId: string;
  orderName: string;
  patience: number;
  maxPatience: number;
  vip: boolean;
  leaveTimer: number;
};

type Player = {
  id: string;
  displayName: string;
  avatarHue: number;
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  sprinting: boolean;
  held: Item | null;
  input: KitchenInput;
  combineCd: number;
};

type OrderDef = { id: string; name: string; patience: number; points: number };

const ORDER_META: Record<string, OrderDef> = {
  // Keep patience in the same band so one dish doesn't hog every seat
  pizza: { id: "pizza", name: "Pizza", patience: 50, points: 130 },
  salad: { id: "salad", name: "Mozzarella", patience: 48, points: 90 },
  fries_meal: { id: "fries_meal", name: "Fries meal", patience: 46, points: 70 },
  burger: { id: "burger", name: "Burger", patience: 54, points: 120 },
  juice: { id: "juice", name: "Juice", patience: 42, points: 45 },
  ice_cream: { id: "ice_cream", name: "Ice cream", patience: 44, points: 50 },
};

let uidSeq = 1;
function uid() {
  return `i${uidSeq++}`;
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canWash(id: string) {
  if (id === "lettuce") return "lettuce_washed";
  if (id === "potato") return "potato_washed";
  if (id === "dirty_plate") return "plate";
  return null;
}

function canChop(id: string) {
  if (id === "tomato" || id === "tomato_washed") return "tomato_chopped";
  if (id === "lettuce" || id === "lettuce_washed") return "lettuce_chopped";
  if (id === "pepper") return "pepper_chopped";
  if (id === "shrimp_raw") return "shrimp_chopped";
  return null;
}

function cookResult(kind: string, id: string) {
  if (kind === "grill" && id === "patty_raw") return "patty_cooked";
  if (kind === "oven" && id === "pizza_raw") return "pizza_cooked";
  if (kind === "fryer" && (id === "potato" || id === "potato_washed" || id === "fries_raw"))
    return "fries";
  if (kind === "fryer" && id === "chicken_floured") return "chicken_fried";
  if (kind === "fryer" && id === "shrimp_floured") return "shrimp_fried";
  if (kind === "grill_panel" && id === "tomato_chopped") return "tomato_grilled";
  if (kind === "grill_panel" && id === "pepper_chopped") return "pepper_grilled";
  return null;
}

function burnResult(kind: string, id: string) {
  if (kind === "grill" && id === "patty_cooked") return "patty_burned";
  if (kind === "oven" && id === "pizza_cooked") return "pizza_burned";
  if (kind === "fryer" && id === "fries") return "fries_burned";
  if (kind === "fryer" && id === "chicken_fried") return "chicken_burned";
  if (kind === "fryer" && id === "shrimp_fried") return "shrimp_burned";
  return null;
}

function isTomatoTopping(id: string) {
  return id === "tomato" || id === "tomato_washed" || id === "tomato_chopped";
}

function tryAssemble(contents: string[]): string | null {
  const set = new Set(contents);
  if (set.has("bun") && set.has("patty_cooked") && set.has("lettuce_chopped") && set.has("tomato_chopped"))
    return "burger";
  if (set.has("lettuce_chopped") && set.has("tomato_chopped") && contents.length === 2) return "salad";
  if (set.has("fries") && contents.length === 1) return "fries_meal";
  return null;
}

function dishMatchesOrder(dishId: string, orderId: string) {
  if (dishId === orderId) return true;
  if (dishId === "fries" && orderId === "fries_meal") return true;
  return false;
}

function circleRectOverlap(cx: number, cy: number, r: number, rect: AuthCollider): boolean {
  const nearestX = Math.max(rect.x - rect.w / 2, Math.min(cx, rect.x + rect.w / 2));
  const nearestY = Math.max(rect.y - rect.h / 2, Math.min(cy, rect.y + rect.h / 2));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < r * r;
}

function toNetItem(item: Item | null): NetItem | null {
  if (!item) return null;
  return {
    uid: item.uid,
    id: item.id,
    x: item.x,
    y: item.y,
    contents: [...item.contents],
  };
}

function ordersForMenu(menu: string[]): OrderDef[] {
  const list = menu.map((id) => ORDER_META[id]).filter(Boolean) as OrderDef[];
  return list.length ? list : [ORDER_META.pizza!, ORDER_META.salad!, ORDER_META.fries_meal!];
}

/** Shared classic kitchen (diner / beach / mall) — server-authoritative. */
export class AuthorityKitchen {
  readonly code: string;
  readonly mapId: string;
  readonly duration: number;
  timeLeft: number;
  score = 0;
  served = 0;
  walkouts = 0;
  tips = 0;
  burns = 0;
  combo = 0;
  ended = false;
  seq = 0;
  private layout: AuthMapLayout;
  private orders: OrderDef[];
  private colliders: AuthCollider[];
  private seats: AuthSeat[];
  private door: { x: number; y: number };
  private spawnMin: number;
  private spawnMax: number;
  private rng: () => number;
  private players = new Map<string, Player>();
  private appliances: Appliance[] = [];
  private worldItems: Item[] = [];
  private customers: Customer[] = [];
  private occupied = new Set<number>();
  private spawnAcc = 0;
  private nextSpawnIn = 4;

  constructor(
    code: string,
    seed: number,
    durationSec: number,
    roster: { id: string; displayName: string; avatarHue: number; slot: number }[],
    mapId = "diner-1",
  ) {
    this.code = code;
    this.layout = getMapLayout(mapId);
    this.mapId = this.layout.id;
    this.duration = durationSec || this.layout.matchSeconds;
    this.timeLeft = this.duration;
    this.rng = mulberry32(seed || 1);
    this.orders = ordersForMenu(this.layout.menu);
    this.colliders = this.layout.colliders;
    this.seats = this.layout.seats;
    this.door = this.layout.door;
    this.spawnMin = this.layout.customerSpawnMs[0] / 1000;
    this.spawnMax = this.layout.customerSpawnMs[1] / 1000;
    this.nextSpawnIn = this.spawnMin + this.rng() * (this.spawnMax - this.spawnMin);

    this.appliances = this.layout.appliances.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      kind: d.kind,
      label: d.label,
      dispenses: d.dispenses,
      items: [],
      process: null,
      plateStock: d.kind === "plates" ? this.layout.plateStock : 0,
    }));

    const spawn = this.layout.spawn;
    for (const r of roster) {
      const ox = (r.slot % 2) * 28 - 14;
      const oy = Math.floor(r.slot / 2) * 24;
      this.players.set(r.id, {
        id: r.id,
        displayName: r.displayName,
        avatarHue: r.avatarHue,
        x: spawn.x + ox,
        y: spawn.y + oy,
        facing: "down",
        moving: false,
        sprinting: false,
        held: null,
        input: { ax: 0, ay: 0, sprint: false, interact: false, drop: false },
        combineCd: 0,
      });
    }
  }

  setInput(playerId: string, input: KitchenInput) {
    const p = this.players.get(playerId);
    if (!p || this.ended) return;
    p.input = {
      ax: Math.max(-1, Math.min(1, Number(input.ax) || 0)),
      ay: Math.max(-1, Math.min(1, Number(input.ay) || 0)),
      sprint: Boolean(input.sprint),
      interact: Boolean(input.interact),
      drop: Boolean(input.drop),
      facing: input.facing,
    };
  }

  removePlayer(playerId: string) {
    const p = this.players.get(playerId);
    if (p?.held) {
      p.held.x = p.x;
      p.held.y = p.y + 12;
      this.worldItems.push(p.held);
      p.held = null;
    }
    this.players.delete(playerId);
  }

  tick(dt: number) {
    if (this.ended) return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) {
      this.ended = true;
      return;
    }
    for (const p of this.players.values()) this.tickPlayer(p, dt);
    for (const a of this.appliances) this.tickAppliance(a, dt);
    this.tickCustomers(dt);
    this.tickSpawns(dt);
    this.seq += 1;
  }

  snapshot(): KitchenSnapshot {
    const plate = this.appliances.find((a) => a.kind === "plates");
    return {
      seq: this.seq,
      code: this.code,
      mapId: this.mapId,
      mode: "classic",
      timeLeft: this.timeLeft,
      duration: this.duration,
      score: this.score,
      served: this.served,
      walkouts: this.walkouts,
      tips: this.tips,
      burns: this.burns,
      combo: this.combo,
      ended: this.ended,
      players: [...this.players.values()].map(
        (p): NetPlayer => ({
          id: p.id,
          displayName: p.displayName,
          avatarHue: p.avatarHue,
          x: p.x,
          y: p.y,
          facing: p.facing,
          moving: p.moving,
          sprinting: p.sprinting,
          held: toNetItem(p.held),
        }),
      ),
      appliances: this.appliances.map(
        (a): NetAppliance => ({
          id: a.id,
          held: toNetItem(a.items[a.items.length - 1] ?? null),
          items: a.items.map((i) => toNetItem(i)!),
          process: a.process
            ? {
                kind: a.process.kind,
                elapsed: a.process.elapsed,
                duration: a.process.duration,
                phase: a.process.phase,
              }
            : null,
          plateStock: a.kind === "plates" ? a.plateStock : undefined,
        }),
      ),
      worldItems: this.worldItems.map((i) => toNetItem(i)!),
      customers: this.customers.map(
        (c): NetCustomer => ({
          seatId: c.seatId,
          phase: c.phase,
          orderId: c.orderId,
          orderName: c.orderName,
          patience: c.patience,
          maxPatience: c.maxPatience,
          x: c.x,
          y: c.y,
          vip: c.vip,
        }),
      ),
      plateStock: plate?.plateStock ?? 0,
    };
  }

  private blocked(x: number, y: number) {
    if (x < 24 || x > MAP_W - 24 || y < 40 || y > MAP_H - 24) return true;
    for (const c of this.colliders) {
      if (circleRectOverlap(x, y, 10, c)) return true;
    }
    return false;
  }

  private tickPlayer(p: Player, dt: number) {
    const inp = p.input;
    let ax = inp.ax;
    let ay = inp.ay;
    const len = Math.hypot(ax, ay);
    if (len > 1) {
      ax /= len;
      ay /= len;
    }
    p.sprinting = inp.sprint && len > 0.05;
    p.moving = len > 0.05;
    const speed = (p.sprinting ? PLAYER_SPRINT : PLAYER_SPEED) * dt;
    if (p.moving) {
      if (Math.abs(ax) > Math.abs(ay)) p.facing = ax < 0 ? "left" : "right";
      else p.facing = ay < 0 ? "up" : "down";
      if (inp.facing) p.facing = inp.facing;
      const nx = p.x + ax * speed;
      const ny = p.y + ay * speed;
      if (!this.blocked(nx, p.y)) p.x = nx;
      if (!this.blocked(p.x, ny)) p.y = ny;
    }
    if (p.held) {
      p.held.x = p.x;
      p.held.y = p.y - 18;
    }
    if (inp.drop) {
      inp.drop = false;
      if (p.held) {
        p.held.x = p.x;
        p.held.y = p.y + 14;
        this.worldItems.push(p.held);
        p.held = null;
      }
    }
    if (inp.interact) {
      inp.interact = false;
      this.resolveInteract(p);
    }
    this.tryProximityCombine(p, dt);
  }

  /** Walk-up assembly: dough↔tomato, ingredient↔plate. */
  private tryProximityCombine(p: Player, dt: number) {
    p.combineCd = Math.max(0, p.combineCd - dt);
    if (p.combineCd > 0 || !p.held) return;

    const heldSide = { id: p.held.id, contents: [...p.held.contents] };
    type Cand = { item: Item; dist: number; app?: Appliance; index?: number };
    let best: Cand | null = null;

    for (const it of this.worldItems) {
      const d = Math.hypot(p.x - it.x, p.y - it.y);
      if (d > PICKUP_RANGE) continue;
      if (!tryHandCombine(heldSide, { id: it.id, contents: [...it.contents] })) continue;
      if (!best || d < best.dist) best = { item: it, dist: d };
    }

    for (const a of this.appliances) {
      if (
        a.kind === "pantry" ||
        a.kind === "plates" ||
        a.kind === "trash" ||
        a.kind === "juice" ||
        a.kind === "icecream" ||
        a.kind === "flour"
      ) {
        continue;
      }
      if (a.process?.phase === "active") continue;
      const range = a.kind === "pass" ? PASS_RANGE : APPLIANCE_RANGE;
      for (let i = 0; i < a.items.length; i++) {
        const it = a.items[i]!;
        const o =
          a.kind === "pass" || a.kind === "counter"
            ? PASS_OFFSETS[Math.min(i, PASS_OFFSETS.length - 1)]!
            : { x: 0, y: -10 };
        const ix = a.x + o.x;
        const iy = a.y + o.y;
        const d = Math.hypot(p.x - ix, p.y - iy);
        if (d > range) continue;
        if (!tryHandCombine(heldSide, { id: it.id, contents: [...it.contents] })) continue;
        if (!best || d < best.dist) best = { item: it, dist: d, app: a, index: i };
      }
    }

    if (!best) return;
    const result = tryHandCombine(heldSide, {
      id: best.item.id,
      contents: [...best.item.contents],
    });
    if (!result) return;

    if (best.app && best.index !== undefined) {
      if (result.kind === "transform_held") {
        best.item.id = result.heldId;
        best.item.contents = [...result.heldContents];
        p.held = null;
        this.layoutPass(best.app);
      } else if (result.kind === "mutate_other_plate") {
        best.item.id = result.otherId;
        best.item.contents = [...result.otherContents];
        p.held = null;
        this.layoutPass(best.app);
      } else {
        best.app.items.splice(best.index, 1);
        p.held.id = result.heldId;
        p.held.contents = [...result.heldContents];
        this.layoutPass(best.app);
      }
    } else {
      this.worldItems = this.worldItems.filter((i) => i.uid !== best!.item.uid);
      if (result.kind === "transform_held" || result.kind === "mutate_held_plate") {
        p.held.id = result.heldId;
        p.held.contents = [...result.heldContents];
      } else {
        best.item.id = result.otherId;
        best.item.contents = [...result.otherContents];
        this.worldItems.push(best.item);
        p.held = null;
      }
    }
    p.combineCd = 0.28;
  }

  private resolveInteract(p: Player) {
    for (const c of this.customers) {
      if (c.phase !== "ordered") continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d > CUSTOMER_RANGE || !p.held) continue;
      let dishId = p.held.id;
      if (dishId === "fries" && c.orderId === "fries_meal") dishId = "fries_meal";
      if (!dishMatchesOrder(dishId, c.orderId)) {
        this.combo = 0;
        continue;
      }
      const order = this.orders.find((o) => o.id === c.orderId) ?? ORDER_META[c.orderId];
      const points = order?.points ?? 80;
      const ratio = c.patience / c.maxPatience;
      const stars = ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
      const tip = Math.floor(points * 0.15 * stars * (c.vip ? 1.5 : 1));
      const mult =
        this.combo >= 8 ? 1.6 : this.combo >= 6 ? 1.4 : this.combo >= 4 ? 1.25 : this.combo >= 2 ? 1.1 : 1;
      this.combo += 1;
      this.score += Math.round(points * mult);
      this.tips += tip;
      this.served += 1;
      if (dishId === "juice" || dishId === "ice_cream") {
        p.held = null;
      } else {
        p.held.id = "dirty_plate";
        p.held.contents = [];
        p.held.x = p.x;
        p.held.y = p.y + 12;
        this.worldItems.push(p.held);
        p.held = null;
      }
      c.phase = "leaving";
      c.leaveTimer = 1.2;
      this.occupied.delete(c.seatId);
      return;
    }

    if (!p.held) {
      let best: Item | null = null;
      let bestD = PICKUP_RANGE;
      for (const it of this.worldItems) {
        const d = Math.hypot(p.x - it.x, p.y - it.y);
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      }
      if (best) {
        this.worldItems = this.worldItems.filter((i) => i.uid !== best!.uid);
        p.held = best;
        return;
      }
    }

    let bestApp: Appliance | null = null;
    let bestD = 9999;
    for (const a of this.appliances) {
      const range =
        a.kind === "pantry" || a.kind === "plates"
          ? PANTRY_RANGE
          : a.kind === "pass"
            ? PASS_RANGE
            : APPLIANCE_RANGE;
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      if (d <= range && d < bestD) {
        bestD = d;
        bestApp = a;
      }
    }
    if (!bestApp) return;
    this.interactAppliance(p, bestApp);
  }

  private interactAppliance(p: Player, a: Appliance) {
    const top = a.items[a.items.length - 1] ?? null;

    if (a.kind === "plates" && p.held?.id === "plate" && p.held.contents.length === 0) {
      a.plateStock += 1;
      p.held = null;
      return;
    }

    if (!p.held && (a.kind === "pantry" || a.kind === "plates" || a.kind === "juice" || a.kind === "icecream")) {
      if (a.kind === "plates") {
        if (a.plateStock <= 0) return;
        a.plateStock -= 1;
      }
      if (!a.dispenses) return;
      p.held = { uid: uid(), id: a.dispenses, x: a.x, y: a.y - 8, contents: [] };
      return;
    }

    if (a.kind === "oven" && top?.id === "pizza_cooked" && p.held?.id === "plate" && p.held.contents.length === 0) {
      a.items.pop();
      a.process = null;
      p.held.id = "pizza";
      p.held.contents = [];
      return;
    }

    if (!p.held && top && (a.kind === "prep" || a.kind === "sink")) {
      if (a.process) return;
      if (a.kind === "prep" && canChop(top.id)) {
        a.process = { kind: "chop", elapsed: 0, duration: CHOP_MS / 1000, phase: "active" };
        return;
      }
      if (a.kind === "sink" && canWash(top.id)) {
        a.process = { kind: "wash", elapsed: 0, duration: WASH_MS / 1000, phase: "active" };
        return;
      }
    }

    if (!p.held && top) {
      if (a.process?.phase === "active") return;
      if (a.kind === "pass" || a.kind === "counter") {
        let bestIdx = a.items.length - 1;
        let bestD = Infinity;
        for (let i = 0; i < a.items.length; i++) {
          const o = PASS_OFFSETS[Math.min(i, PASS_OFFSETS.length - 1)]!;
          const ix = a.x + o.x;
          const iy = a.y + o.y;
          const d = (p.x - ix) ** 2 + (p.y - iy) ** 2;
          if (d < bestD) {
            bestD = d;
            bestIdx = i;
          }
        }
        const picked = a.items.splice(bestIdx, 1)[0]!;
        a.process = null;
        p.held = picked;
        this.layoutPass(a);
        return;
      }
      a.items.pop();
      a.process = null;
      p.held = top;
      return;
    }

    if (!p.held) return;

    if (a.kind === "trash") {
      p.held = null;
      return;
    }

    // Pass / hold: merge onto dough/plate first, else park if there is room
    if (a.kind === "pass" || a.kind === "counter") {
      const heldSide = { id: p.held.id, contents: [...p.held.contents] };
      let bestIdx = -1;
      let bestD = Infinity;
      for (let i = 0; i < a.items.length; i++) {
        const it = a.items[i]!;
        if (!tryHandCombine(heldSide, { id: it.id, contents: [...it.contents] })) continue;
        const o =
          a.kind === "pass"
            ? PASS_OFFSETS[Math.min(i, PASS_OFFSETS.length - 1)]!
            : { x: 0, y: -10 };
        const d = (p.x - (a.x + o.x)) ** 2 + (p.y - (a.y + o.y)) ** 2;
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        const target = a.items[bestIdx]!;
        const result = tryHandCombine(heldSide, {
          id: target.id,
          contents: [...target.contents],
        });
        if (result?.kind === "transform_held") {
          target.id = result.heldId;
          target.contents = [...result.heldContents];
          p.held = null;
          this.layoutPass(a);
          return;
        }
        if (result?.kind === "mutate_other_plate") {
          target.id = result.otherId;
          target.contents = [...result.otherContents];
          p.held = null;
          this.layoutPass(a);
          return;
        }
        if (result?.kind === "mutate_held_plate") {
          a.items.splice(bestIdx, 1);
          p.held.id = result.heldId;
          p.held.contents = [...result.heldContents];
          this.layoutPass(a);
          return;
        }
      }
      const cap = a.kind === "pass" ? 3 : 1;
      if (a.items.length >= cap) return;
      a.items.push(p.held);
      p.held = null;
      this.layoutPass(a);
      return;
    }

    if (top?.id === "pizza_dough" && isTomatoTopping(p.held.id)) {
      top.id = "pizza_raw";
      top.contents = [];
      p.held = null;
      this.maybeStartCook(a);
      return;
    }
    if (top && isTomatoTopping(top.id) && p.held.id === "pizza_dough") {
      a.items.pop();
      p.held.id = "pizza_raw";
      p.held.contents = [];
      a.items.push(p.held);
      p.held = null;
      this.maybeStartCook(a);
      return;
    }

    if (
      top?.id === "plate" &&
      !p.held.id.includes("plate") &&
      !["burger", "salad", "fries_meal", "pizza", "juice", "ice_cream"].includes(p.held.id)
    ) {
      if (!top.contents.includes(p.held.id) && !p.held.id.includes("burned")) {
        top.contents.push(p.held.id);
        const dish = tryAssemble(top.contents);
        if (dish) {
          top.id = dish;
          top.contents = [];
        }
        p.held = null;
        return;
      }
    }

    const cap = a.kind === "pass" ? 3 : 1;
    if (a.items.length >= cap) return;
    if (!this.canAccept(a, p.held)) return;
    a.items.push(p.held);
    p.held = null;
    this.layoutPass(a);
    this.maybeStartCook(a);
  }

  private layoutPass(a: Appliance) {
    if (a.kind !== "pass" && a.kind !== "counter") return;
    for (let i = 0; i < a.items.length; i++) {
      const o = PASS_OFFSETS[Math.min(i, PASS_OFFSETS.length - 1)]!;
      const it = a.items[i]!;
      it.x = a.x + o.x;
      it.y = a.y + o.y;
    }
  }

  private canAccept(a: Appliance, item: Item) {
    if (a.kind === "pass" || a.kind === "counter") {
      const heldSide = { id: item.id, contents: [...item.contents] };
      for (const it of a.items) {
        if (tryHandCombine(heldSide, { id: it.id, contents: [...it.contents] })) return true;
      }
      return a.kind === "pass" ? a.items.length < 3 : a.items.length < 1;
    }
    if (a.kind === "prep") return true;
    if (a.kind === "sink") return canWash(item.id) !== null || item.id === "dirty_plate" || item.id === "plate";
    if (a.kind === "grill") return item.id === "patty_raw";
    if (a.kind === "oven") return item.id === "pizza_raw" || item.id === "pizza_dough" || isTomatoTopping(item.id);
    if (a.kind === "fryer")
      return (
        item.id === "potato" ||
        item.id === "potato_washed" ||
        item.id === "fries_raw" ||
        item.id === "chicken_floured" ||
        item.id === "shrimp_floured"
      );
    if (a.kind === "trash") return true;
    return false;
  }

  private maybeStartCook(a: Appliance) {
    const top = a.items[a.items.length - 1];
    if (!top || a.process) return;
    if (a.kind !== "grill" && a.kind !== "oven" && a.kind !== "fryer" && a.kind !== "grill_panel") return;
    const next = cookResult(a.kind, top.id);
    if (!next) return;
    const cook = a.kind === "oven" ? PIZZA_COOK_MS / 1000 : COOK_MS / 1000;
    const burn = a.kind === "oven" ? PIZZA_BURN_MS / 1000 : BURN_MS / 1000;
    a.process = { kind: "cook", elapsed: 0, duration: cook, phase: "active" };
    (a.process as NetProcess & { burnDuration?: number }).burnDuration = burn;
  }

  private tickAppliance(a: Appliance, dt: number) {
    if (!a.process) return;
    const proc = a.process as NetProcess & { burnDuration?: number };
    if (proc.phase === "active") {
      proc.elapsed += dt;
      if (proc.elapsed >= proc.duration) {
        const top = a.items[a.items.length - 1];
        if (!top) {
          a.process = null;
          return;
        }
        if (proc.kind === "chop") {
          const next = canChop(top.id);
          if (next) top.id = next;
          a.process = null;
          return;
        }
        if (proc.kind === "wash") {
          const next = canWash(top.id);
          if (next) top.id = next;
          a.process = null;
          return;
        }
        if (proc.kind === "cook") {
          const next = cookResult(a.kind, top.id);
          if (next) top.id = next;
          proc.phase = "ready";
          proc.elapsed = 0;
          proc.duration = proc.burnDuration ?? BURN_MS / 1000;
        }
      }
    } else if (proc.phase === "ready" && proc.kind === "cook") {
      proc.elapsed += dt;
      if (proc.elapsed >= proc.duration) {
        const top = a.items[a.items.length - 1];
        if (top) {
          const burned = burnResult(a.kind, top.id);
          if (burned) {
            top.id = burned;
            this.burns += 1;
            this.combo = 0;
          }
        }
        proc.phase = "burning";
      }
    }
  }

  private tickCustomers(dt: number) {
    for (const c of [...this.customers]) {
      if (c.phase === "entering") {
        const dx = c.seatX - c.x;
        const dy = c.seatY - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = 90 * dt;
        if (d <= step) {
          c.x = c.seatX;
          c.y = c.seatY;
          c.phase = "ordered";
        } else {
          c.x += (dx / d) * step;
          c.y += (dy / d) * step;
        }
      } else if (c.phase === "ordered") {
        c.patience -= dt;
        if (c.patience <= 0) {
          c.phase = "leaving";
          c.leaveTimer = 1.2;
          this.occupied.delete(c.seatId);
          this.walkouts += 1;
          this.score = Math.max(0, this.score - 40);
          this.combo = 0;
        }
      } else if (c.phase === "leaving") {
        const dx = this.door.x - c.x;
        const dy = this.door.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = 110 * dt;
        if (d <= step) {
          this.customers = this.customers.filter((x) => x !== c);
        } else {
          c.x += (dx / d) * step;
          c.y += (dy / d) * step;
        }
      }
    }
  }

  private tickSpawns(dt: number) {
    if (this.timeLeft <= 20) return;
    this.spawnAcc += dt;
    if (this.spawnAcc < this.nextSpawnIn) return;
    this.spawnAcc = 0;
    this.nextSpawnIn = this.spawnMin + this.rng() * (this.spawnMax - this.spawnMin);
    const free = this.seats.filter((s) => !this.occupied.has(s.id));
    if (!free.length) return;
    const seat = free[Math.floor(this.rng() * free.length)]!;

    // Prefer orders that are under-represented among guests already seated
    const counts = new Map<string, number>();
    for (const o of this.orders) counts.set(o.id, 0);
    for (const c of this.customers) {
      if (c.phase !== "ordered" && c.phase !== "entering") continue;
      if (counts.has(c.orderId)) counts.set(c.orderId, (counts.get(c.orderId) ?? 0) + 1);
    }
    const min = Math.min(...[...counts.values()]);
    const under = this.orders.filter((o) => (counts.get(o.id) ?? 0) === min);
    const pickFrom = under.length ? under : this.orders;
    const order = pickFrom[Math.floor(this.rng() * pickFrom.length)]!;
    const vip = this.rng() < 0.12;
    const patience = order.patience * (vip ? 1.15 : 1) * (0.9 + this.rng() * 0.25);
    this.occupied.add(seat.id);
    this.customers.push({
      seatId: seat.id,
      seatX: seat.x,
      seatY: seat.y,
      x: this.door.x,
      y: this.door.y,
      phase: "entering",
      orderId: order.id,
      orderName: order.name,
      patience,
      maxPatience: patience,
      vip,
      leaveTimer: 0,
    });
  }
}
