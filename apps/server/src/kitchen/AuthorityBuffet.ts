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
  NetTray,
} from "@gastronomica/shared";
import { getMapLayout } from "@gastronomica/shared";

const MAP_W = 960;
const MAP_H = 540;
const PLAYER_SPEED = 140;
const PLAYER_SPRINT = 210;
const COOK_MS = 3500;
const CHOP_MS = 1200;
const WASH_MS = 1000;
const BURN_MS = 12000;
const APPLIANCE_RANGE = 56;
const PANTRY_RANGE = 100;
const TRAY_RANGE = 80;
const CUSTOMER_RANGE = 90;
const PICKUP_RANGE = 48;
const PREP_GATE_SEC = 18;
const EAT_SEC = 9;
const JUICE_WAIT_SEC = 18;
const EMPTY_WAIT_SEC = 5;
const BUFFET_BASE_POINTS = 110;
/** Wave 1: clean stack. Wave 2+: dirty wash loop. */
const NEED_PLATE_SEC_WAVE1 = 45;
const NEED_PLATE_SEC_LATER = 100;
const BUFFET_WAIT_SEC = 55;
const JUICE_DRAIN_SEC = 40;
const GROUP_SIZES = [4, 6, 8] as const;

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

type Tray = {
  id: string;
  x: number;
  y: number;
  label: string;
  accepts: string;
  max: number;
  addPerStock: number;
  stock: number;
};

type Customer = {
  seatId: number;
  seatX: number;
  seatY: number;
  x: number;
  y: number;
  phase: NetCustomer["phase"];
  patience: number;
  maxPatience: number;
  vip: boolean;
  hasPlate: boolean;
  foodsTaken: number;
  trayIndex: number;
  emptyWait: number;
  waitLabel: string;
  eatTimer: number;
  wantsJuice: boolean;
  juiceServed: boolean;
  juiceTimer: number;
  satisfaction: number;
  walkingOut: boolean;
  needPlateSec: number;
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
  return id === "dirty_plate" ? "plate" : null;
}

function canChop(id: string) {
  if (id === "tomato") return "tomato_chopped";
  if (id === "pepper") return "pepper_chopped";
  if (id === "shrimp_raw") return "shrimp_chopped";
  return null;
}

function flourResult(id: string) {
  if (id === "chicken_raw") return "chicken_floured";
  if (id === "shrimp_chopped" || id === "shrimp_raw") return "shrimp_floured";
  return null;
}

function cookResult(kind: string, id: string) {
  if (kind === "fryer" && id === "fries_raw") return "fries";
  if (kind === "fryer" && id === "chicken_floured") return "chicken_fried";
  if (kind === "fryer" && id === "shrimp_floured") return "shrimp_fried";
  if (kind === "grill_panel" && id === "tomato_chopped") return "tomato_grilled";
  if (kind === "grill_panel" && id === "pepper_chopped") return "pepper_grilled";
  return null;
}

function burnResult(kind: string, id: string) {
  if (kind === "fryer" && id === "fries") return "fries_burned";
  if (kind === "fryer" && id === "chicken_fried") return "chicken_burned";
  if (kind === "fryer" && id === "shrimp_fried") return "shrimp_burned";
  return null;
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
  return { uid: item.uid, id: item.id, x: item.x, y: item.y, contents: [...item.contents] };
}

function applianceRange(kind: string) {
  return kind === "pantry" || kind === "plates" || kind === "juice" || kind === "flour"
    ? PANTRY_RANGE
    : APPLIANCE_RANGE;
}

function bubbleText(c: Customer): string {
  switch (c.phase) {
    case "needPlate":
      return "Plate!";
    case "buffet":
      return c.emptyWait > 0 ? `Wait ${c.waitLabel}` : "Buffet…";
    case "eating":
      return "Eating…";
    case "wantJuice":
      return "Juice!";
    case "leaving":
      return c.walkingOut ? "Bye!" : "";
    default:
      return "";
  }
}

/** Server-authoritative buffet kitchen (buffet-1). */
export class AuthorityBuffet {
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
  private colliders: AuthCollider[];
  private seats: AuthSeat[];
  private door: { x: number; y: number };
  private spawnMin: number;
  private spawnMax: number;
  private rng: () => number;
  private players = new Map<string, Player>();
  private appliances: Appliance[] = [];
  private trays: Tray[] = [];
  private worldItems: Item[] = [];
  private customers: Customer[] = [];
  private occupied = new Set<number>();
  private waveIndex = 0;
  private prepElapsed = 0;
  private firstSpawned = false;
  private wavePending = false;
  private waveCooldown = 0;

  constructor(
    code: string,
    seed: number,
    durationSec: number,
    roster: { id: string; displayName: string; avatarHue: number; slot: number }[],
    mapId = "buffet-1",
  ) {
    this.code = code;
    this.layout = getMapLayout(mapId);
    this.mapId = this.layout.id;
    this.duration = durationSec || this.layout.matchSeconds;
    this.timeLeft = this.duration;
    this.rng = mulberry32(seed || 1);
    this.colliders = this.layout.colliders;
    this.seats = this.layout.seats;
    this.door = this.layout.door;
    this.spawnMin = this.layout.customerSpawnMs[0] / 1000;
    this.spawnMax = this.layout.customerSpawnMs[1] / 1000;

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

    for (const a of this.appliances) {
      if (a.kind === "grill_panel") {
        a.items.push({ uid: uid(), id: "grill_pan", x: a.x, y: a.y - 8, contents: [] });
      }
    }

    this.trays = (this.layout.buffetTrays ?? []).map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      label: t.label,
      accepts: t.accepts,
      max: t.max,
      addPerStock: t.addPerStock,
      stock: 0,
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
      mode: "buffet",
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
          orderId: c.phase,
          orderName: bubbleText(c),
          patience: c.satisfaction,
          maxPatience: 1,
          x: c.x,
          y: c.y,
          vip: c.vip,
        }),
      ),
      plateStock: plate?.plateStock ?? 0,
      trays: this.trays.map(
        (t): NetTray => ({
          id: t.id,
          stock: t.stock,
          max: t.max,
          label: t.label,
          accepts: t.accepts,
        }),
      ),
      waveIndex: this.waveIndex,
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
  }

  private resolveInteract(p: Player) {
    if (p.held?.id === "plate" && p.held.contents.length === 0) {
      const c = this.nearestCustomer(p.x, p.y, "needPlate");
      if (c) {
        c.hasPlate = true;
        c.phase = "buffet";
        c.trayIndex = 0;
        p.held = null;
        return;
      }
    }
    if (p.held?.id === "juice") {
      const c = this.nearestCustomer(p.x, p.y, "wantJuice");
      if (c) {
        c.juiceServed = true;
        c.phase = "eating";
        p.held = null;
        return;
      }
    }

    if (p.held) {
      const tray = this.nearestTray(p.x, p.y);
      if (tray && this.stockTray(tray, p)) return;
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
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      if (d <= applianceRange(a.kind) && d < bestD) {
        bestD = d;
        bestApp = a;
      }
    }
    if (!bestApp) return;
    this.interactAppliance(p, bestApp);
  }

  private nearestCustomer(px: number, py: number, phase: NetCustomer["phase"]) {
    let best: Customer | null = null;
    let bestD = CUSTOMER_RANGE;
    for (const c of this.customers) {
      if (c.phase !== phase) continue;
      const d = Math.hypot(px - c.x, py - c.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  private nearestTray(px: number, py: number) {
    let best: Tray | null = null;
    let bestD = TRAY_RANGE;
    for (const t of this.trays) {
      const d = Math.hypot(px - t.x, py - t.y);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  private stockTray(tray: Tray, p: Player): boolean {
    const held = p.held;
    if (!held) return false;
    if (held.id === "grill_pan" && held.contents[0] === tray.accepts) {
      if (tray.stock >= tray.max) return false;
      const add = Math.min(tray.max - tray.stock, tray.addPerStock);
      tray.stock += add;
      held.contents = [];
      return true;
    }
    if (held.id === tray.accepts) {
      if (tray.stock >= tray.max) return false;
      const add = Math.min(tray.max - tray.stock, tray.addPerStock);
      tray.stock += add;
      p.held = null;
      return true;
    }
    return false;
  }

  private interactAppliance(p: Player, a: Appliance) {
    const top = a.items[a.items.length - 1] ?? null;

    if (a.kind === "plates" && p.held?.id === "plate" && p.held.contents.length === 0) {
      a.plateStock += 1;
      p.held = null;
      return;
    }

    if (a.kind === "flour" && p.held) {
      const next = flourResult(p.held.id);
      if (next) {
        p.held.id = next;
        return;
      }
    }

    if (
      p.held &&
      (p.held.id === "tomato_chopped" || p.held.id === "pepper_chopped") &&
      top?.id === "grill_pan" &&
      top.contents.length === 0
    ) {
      top.contents.push(p.held.id);
      p.held = null;
      if (a.kind === "grill_panel") this.maybeStartCook(a);
      return;
    }

    if (!p.held && (a.kind === "pantry" || a.kind === "plates" || a.kind === "juice")) {
      if (a.kind === "plates") {
        if (a.plateStock <= 0) return;
        a.plateStock -= 1;
      }
      if (!a.dispenses) return;
      p.held = { uid: uid(), id: a.dispenses, x: a.x, y: a.y - 8, contents: [] };
      return;
    }

    if (!p.held && top && (a.kind === "prep" || a.kind === "sink" || a.kind === "flour")) {
      if (a.process) return;
      if (a.kind === "prep" && canChop(top.id)) {
        a.process = { kind: "chop", elapsed: 0, duration: CHOP_MS / 1000, phase: "active" };
        return;
      }
      if (a.kind === "sink" && canWash(top.id)) {
        a.process = { kind: "wash", elapsed: 0, duration: WASH_MS / 1000, phase: "active" };
        return;
      }
      if (a.kind === "flour" && flourResult(top.id)) {
        top.id = flourResult(top.id)!;
        return;
      }
    }

    if (!p.held && top) {
      if (a.process?.phase === "active") return;
      a.items.pop();
      a.process = null;
      p.held = top;
      if (a.kind === "counter") {
        // single-slot hold — no layout needed
      }
      return;
    }

    if (!p.held) return;

    if (a.kind === "trash") {
      p.held = null;
      return;
    }

    // Free hold spots beside fryers — park any one item
    if (a.kind === "counter") {
      if (a.items.length >= 1) return;
      p.held.x = a.x;
      p.held.y = a.y - 10;
      a.items.push(p.held);
      p.held = null;
      return;
    }

    const cap = 1;
    if (a.items.length >= cap) return;
    if (!this.canAccept(a, p.held)) return;
    a.items.push(p.held);
    p.held = null;
    this.maybeStartCook(a);
  }

  private canAccept(a: Appliance, item: Item) {
    if (a.kind === "counter") return a.items.length < 1;
    if (a.kind === "prep") return canChop(item.id) !== null;
    if (a.kind === "sink") return canWash(item.id) !== null;
    if (a.kind === "flour") return flourResult(item.id) !== null;
    if (a.kind === "fryer")
      return (
        item.id === "fries_raw" ||
        item.id === "chicken_floured" ||
        item.id === "shrimp_floured"
      );
    if (a.kind === "grill_panel") return item.id === "grill_pan";
    if (a.kind === "trash") return true;
    return false;
  }

  private maybeStartCook(a: Appliance) {
    if (a.process) return;
    if (a.kind === "fryer") {
      const top = a.items[a.items.length - 1];
      if (!top || !cookResult(a.kind, top.id)) return;
      const proc = { kind: "cook" as const, elapsed: 0, duration: COOK_MS / 1000, phase: "active" as const };
      (proc as NetProcess & { burnDuration?: number }).burnDuration = BURN_MS / 1000;
      a.process = proc;
      return;
    }
    if (a.kind === "grill_panel") {
      const pan = a.items[a.items.length - 1];
      if (!pan || pan.id !== "grill_pan" || !pan.contents[0]) return;
      if (!cookResult(a.kind, pan.contents[0])) return;
      a.process = { kind: "cook", elapsed: 0, duration: COOK_MS / 1000, phase: "active" };
    }
  }

  private tickAppliance(a: Appliance, dt: number) {
    if (!a.process) return;
    const proc = a.process as NetProcess & { burnDuration?: number };
    const top = a.items[a.items.length - 1];
    if (proc.phase === "active") {
      proc.elapsed += dt;
      if (proc.elapsed >= proc.duration) {
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
          if (a.kind === "grill_panel" && top.id === "grill_pan" && top.contents[0]) {
            const next = cookResult(a.kind, top.contents[0]);
            if (next) top.contents[0] = next;
          } else {
            const next = cookResult(a.kind, top.id);
            if (next) top.id = next;
          }
          proc.phase = "ready";
          proc.elapsed = 0;
          proc.duration = proc.burnDuration ?? BURN_MS / 1000;
        }
      }
    } else if (proc.phase === "ready" && proc.kind === "cook") {
      proc.elapsed += dt;
      if (proc.elapsed >= proc.duration) {
        if (top) {
          const burned =
            a.kind === "grill_panel"
              ? null
              : burnResult(a.kind, top.id === "grill_pan" ? top.contents[0] ?? "" : top.id);
          if (burned) {
            if (top.id === "grill_pan" && top.contents[0]) top.contents[0] = burned;
            else top.id = burned;
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
        const step = 48 * dt;
        if (d <= step) {
          c.x = c.seatX;
          c.y = c.seatY;
          c.phase = "needPlate";
        } else {
          c.x += (dx / d) * step;
          c.y += (dy / d) * step;
        }
      } else if (c.phase === "needPlate") {
        c.satisfaction -= dt / (c.needPlateSec || NEED_PLATE_SEC_LATER);
        if (c.satisfaction <= 0) this.walkout(c);
      } else if (c.phase === "buffet") {
        c.emptyWait -= dt;
        if (c.emptyWait > 0) {
          c.satisfaction -= dt / BUFFET_WAIT_SEC;
          if (c.satisfaction <= 0) this.walkout(c);
          continue;
        }
        while (c.trayIndex < this.trays.length) {
          const tray = this.trays[c.trayIndex]!;
          c.trayIndex += 1;
          if (tray.stock <= 0) {
            c.emptyWait = EMPTY_WAIT_SEC;
            c.waitLabel = tray.label;
            c.satisfaction -= 0.02;
            break;
          }
          tray.stock -= 1;
          c.foodsTaken += 1;
          c.x = tray.x + (this.rng() - 0.5) * 20;
          c.y = tray.y + 40;
        }
        if (c.trayIndex >= this.trays.length) {
          if (c.foodsTaken <= 0) this.walkout(c);
          else {
            c.phase = "eating";
            c.eatTimer = EAT_SEC;
            c.wantsJuice = this.rng() < 0.3;
            c.x = c.seatX;
            c.y = c.seatY;
          }
        }
      } else if (c.phase === "eating") {
        c.eatTimer -= dt;
        if (c.wantsJuice && !c.juiceServed && c.eatTimer < EAT_SEC * 0.55) {
          c.phase = "wantJuice";
          c.juiceTimer = JUICE_WAIT_SEC;
        } else if (c.eatTimer <= 0) {
          this.finishCustomer(c);
        }
      } else if (c.phase === "wantJuice") {
        c.juiceTimer -= dt;
        c.satisfaction -= dt / JUICE_DRAIN_SEC;
        if (c.juiceTimer <= 0 || c.satisfaction <= 0) {
          c.satisfaction = Math.max(0.25, c.satisfaction - 0.2);
          this.finishCustomer(c);
        }
      } else if (c.phase === "leaving") {
        const dx = this.door.x - c.x;
        const dy = this.door.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = 55 * dt;
        if (d <= step) {
          this.occupied.delete(c.seatId);
          this.customers = this.customers.filter((x) => x !== c);
        } else {
          c.x += (dx / d) * step;
          c.y += (dy / d) * step;
        }
      }
    }
  }

  private walkout(c: Customer) {
    if (c.phase === "leaving") return;
    c.phase = "leaving";
    c.walkingOut = true;
    // Keep seat occupied until they fully exit the door
    this.walkouts += 1;
    this.score = Math.max(0, this.score - 40);
    this.combo = 0;
  }

  private finishCustomer(c: Customer) {
    if (c.phase === "leaving") return;
    const ratio = Math.max(0, Math.min(1, c.satisfaction));
    const stars = ratio > 0.66 ? 3 : ratio > 0.33 ? 2 : 1;
    const juiceBonus = c.juiceServed ? 20 : 0;
    const foodBonus = c.foodsTaken * 8;
    const points = Math.round((BUFFET_BASE_POINTS + foodBonus + juiceBonus) * (0.7 + ratio * 0.5));
    const tip = Math.round(points * 0.12 * stars);
    const mult =
      this.combo >= 8 ? 1.6 : this.combo >= 6 ? 1.4 : this.combo >= 4 ? 1.25 : this.combo >= 2 ? 1.1 : 1;
    this.combo += 1;
    this.score += Math.round(points * mult);
    this.tips += tip;
    this.served += 1;
    this.worldItems.push({
      uid: uid(),
      id: "dirty_plate",
      x: c.seatX,
      y: c.seatY + 10,
      contents: [],
    });
    c.phase = "leaving";
    c.walkingOut = false;
    // Seat stays reserved until they reach the door
  }

  private tickSpawns(dt: number) {
    this.prepElapsed += dt;
    if (!this.firstSpawned) {
      if (this.prepElapsed < PREP_GATE_SEC) return;
      this.spawnGroup();
      this.firstSpawned = true;
      return;
    }
    // Wait until every guest (including leavers) is gone and seats are free
    if (this.customers.length === 0 && this.occupied.size === 0 && !this.wavePending) {
      this.wavePending = true;
      this.waveCooldown = Math.max(4.5, this.spawnMin + this.rng() * (this.spawnMax - this.spawnMin));
    }
    if (this.wavePending) {
      this.waveCooldown -= dt;
      if (this.waveCooldown <= 0) {
        this.spawnGroup();
        this.wavePending = false;
      }
    }
  }

  private spawnGroup() {
    this.waveIndex += 1;
    const size = GROUP_SIZES[(this.waveIndex - 1) % GROUP_SIZES.length]!;
    const free = this.seats.filter((s) => !this.occupied.has(s.id));
    if (!free.length) {
      this.waveIndex -= 1;
      return;
    }
    const shuffled = [...free].sort(() => this.rng() - 0.5);
    const count = Math.min(size, shuffled.length);
    const needPlateSec = this.waveIndex <= 1 ? NEED_PLATE_SEC_WAVE1 : NEED_PLATE_SEC_LATER;
    for (let i = 0; i < count; i++) {
      const seat = shuffled[i]!;
      this.occupied.add(seat.id);
      this.customers.push({
        seatId: seat.id,
        seatX: seat.x,
        seatY: seat.y,
        x: this.door.x,
        y: this.door.y,
        phase: "entering",
        patience: 1,
        maxPatience: 1,
        vip: false,
        hasPlate: false,
        foodsTaken: 0,
        trayIndex: 0,
        emptyWait: 0,
        waitLabel: "",
        eatTimer: 0,
        wantsJuice: false,
        juiceServed: false,
        juiceTimer: 0,
        satisfaction: 1,
        walkingOut: false,
        needPlateSec,
      });
    }
  }
}
