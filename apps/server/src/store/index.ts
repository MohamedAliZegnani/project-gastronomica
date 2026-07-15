import { isDbReady } from "../db.js";
import * as memory from "./memory.js";
import * as postgres from "./postgres.js";

function backend() {
  return isDbReady() ? postgres : memory;
}

export async function registerUser(...args: Parameters<typeof memory.registerUser>) {
  return backend().registerUser(...args);
}

export async function loginUser(...args: Parameters<typeof memory.loginUser>) {
  return backend().loginUser(...args);
}

export async function guestUser(...args: Parameters<typeof memory.guestUser>) {
  return backend().guestUser(...args);
}

export async function logout(...args: Parameters<typeof memory.logout>) {
  return backend().logout(...args);
}

export async function getDashboard(...args: Parameters<typeof memory.getDashboard>) {
  return backend().getDashboard(...args);
}

export async function getFriends(...args: Parameters<typeof memory.getFriends>) {
  return backend().getFriends(...args);
}

export async function getInventory(...args: Parameters<typeof memory.getInventory>) {
  return backend().getInventory(...args);
}

export async function getShop(...args: Parameters<typeof memory.getShop>) {
  return backend().getShop(...args);
}

export async function getLeaderboard(...args: Parameters<typeof memory.getLeaderboard>) {
  return backend().getLeaderboard(...args);
}

export async function getSettings(...args: Parameters<typeof memory.getSettings>) {
  return backend().getSettings(...args);
}

export async function updateSettings(...args: Parameters<typeof memory.updateSettings>) {
  return backend().updateSettings(...args);
}

export async function getProfile(...args: Parameters<typeof memory.getProfile>) {
  return backend().getProfile(...args);
}

export async function applyMatchRewards(...args: Parameters<typeof memory.applyMatchRewards>) {
  return backend().applyMatchRewards(...args);
}

export function persistenceMode(): "postgres" | "memory" {
  return isDbReady() ? "postgres" : "memory";
}
