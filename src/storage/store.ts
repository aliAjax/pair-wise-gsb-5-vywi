// 保存层：当前依赖与裁决历史的读写（localStorage 封装，键名版本化）
import type { Dep } from '../data/catalog';
import type { Ruling } from '../rules/engine';

const DEPS_KEY = 'license-lens:deps:v2';
const RULINGS_KEY = 'license-lens:rulings:v1';
const MAX_RULINGS = 20;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 存储不可用（隐私模式/配额）时静默降级，不影响页面判断
  }
}

export const loadDeps = (fallback: Dep[]): Dep[] => read<Dep[]>(DEPS_KEY, fallback);

export const saveDeps = (deps: Dep[]): void => write(DEPS_KEY, deps);

export const loadRulings = (): Ruling[] => read<Ruling[]>(RULINGS_KEY, []);

/** 追加裁决；旧裁决原样保留、不回写不覆盖，超出上限只淘汰最早条目 */
export const appendRuling = (ruling: Ruling): Ruling[] => {
  const history = loadRulings();
  const next = [...history, ruling].slice(-MAX_RULINGS);
  write(RULINGS_KEY, next);
  return next;
};
