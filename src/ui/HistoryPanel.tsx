import { History, ShieldCheck, X } from 'lucide-react';
import { LEVEL_META, LINK_META, licenseById, type Level } from '../data/catalog';
import type { Ruling } from '../rules/engine';

interface Props {
  open: boolean;
  history: Ruling[];
  activeId?: string;
  onClose: () => void;
}

const fmt = (at: number) => {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function HistoryPanel({ open, history, activeId, onClose }: Props) {
  return (
    <div className={open ? 'drawer-mask open' : 'drawer-mask'} onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <span className="dh-kicker">ARCHIVE</span>
            <h2><History size={17} /> 裁决存档</h2>
          </div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <p className="drawer-note">
          每次核验保存都会生成一份不可变裁决：完整登记快照、冲突与义务随之冻结。整改后重新计算只追加新裁决，旧裁决不会被覆盖。
        </p>
        <div className="ruling-list">
          {history.length === 0 && (
            <div className="ruling-empty">
              <ShieldCheck size={26} />
              <p>还没有保存过裁决</p>
              <small>调整完链接方式后点“重新核验并存档”</small>
            </div>
          )}
          {[...history].reverse().map((r) => (
            <article key={r.id} className={r.id === activeId ? 'ruling active' : 'ruling'}>
              <header>
                <b>{r.id}</b>
                <span>{fmt(r.at)}</span>
              </header>
              <div className="ruling-levels">
                {(['block', 'warn', 'notice', 'pass'] as Level[]).map((lv) => (
                  <span key={lv} className={`rl lvl-${lv}`} style={{ color: LEVEL_META[lv].color }}>
                    {LEVEL_META[lv].label} {r.counts[lv]}
                  </span>
                ))}
              </div>
              <p className="ruling-meta">
                {r.deps.length} 个依赖 · {r.pairCount} 对组合 · 总体
                <b style={{ color: LEVEL_META[r.overall].color }}> {LEVEL_META[r.overall].label}</b>
              </p>
              <div className="ruling-snapshot">
                {r.deps.map((d) => (
                  <span key={d.id} title={licenseById(d.license).label}>
                    {d.name}
                    <em className={`lk lk-${d.linkKind}`}>{LINK_META[d.linkKind].short}</em>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
