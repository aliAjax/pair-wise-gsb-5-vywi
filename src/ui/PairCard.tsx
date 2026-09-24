import { useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronDown,
  GitFork,
  Info,
  Link2,
  ListChecks,
  Plug,
  Terminal,
  Wrench,
} from 'lucide-react';
import {
  LEVEL_META,
  LINK_META,
  licenseById,
  type Dep,
  type LinkKind,
} from '../data/catalog';
import { simulateRemedy, type PairVerdict } from '../rules/engine';

const LINK_ICON: Record<LinkKind, typeof Boxes> = {
  static: Boxes,
  dynamic: Link2,
  plugin: Plug,
  process: Terminal,
};

const LEVEL_ICON = { block: AlertTriangle, warn: Wrench, notice: Info, pass: Check };

interface Props {
  verdict: PairVerdict;
  deps: Dep[];
  onApply: (depId: number, kind: LinkKind) => void;
}

export default function PairCard({ verdict, deps, onApply }: Props) {
  const [open, setOpen] = useState(verdict.level === 'block' || verdict.level === 'warn');
  const a = deps.find((d) => d.id === verdict.aId);
  const b = deps.find((d) => d.id === verdict.bId);
  if (!a || !b) return null;
  const meta = LEVEL_META[verdict.level];
  const Icon = LEVEL_ICON[verdict.level];

  const depChip = (d: Dep) => {
    const p = licenseById(d.license);
    const LinkIcon = LINK_ICON[d.linkKind];
    return (
      <span className="pair-chip">
        <b>{d.name}</b>
        <small>{d.version}</small>
        <i className="license" style={{ color: p.color, background: p.color + '18' }}>
          {p.label}
        </i>
        <em className={`lk lk-${d.linkKind}`}>
          <LinkIcon size={11} /> {LINK_META[d.linkKind].short}
        </em>
      </span>
    );
  };

  return (
    <div className={`pair-card pc-${verdict.level}`}>
      <button className="pair-head" onClick={() => setOpen((o) => !o)}>
        <span className={`pair-level lvl-${verdict.level}`}>
          <Icon size={13} /> {meta.label}
        </span>
        {depChip(a)}
        <GitFork size={14} className="pair-x" />
        {depChip(b)}
        <ChevronDown size={15} className={open ? 'pair-chev up' : 'pair-chev'} />
      </button>
      {open && (
        <div className="pair-body">
          <h4>{verdict.title}</h4>
          <p>{verdict.reason}</p>

          {verdict.triggered.length > 0 && (
            <div className="pair-section">
              <span className="ps-title"><ListChecks size={13} /> 触发的许可证义务</span>
              <ul>
                {verdict.triggered.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {verdict.remedies.length > 0 && (
            <div className="pair-section">
              <span className="ps-title"><Wrench size={13} /> 可选整改（调整链接方式后自动重算）</span>
              <div className="remedy-row">
                {verdict.remedies.map((k) => {
                  const target = simulateRemedy(a, b, k);
                  if (!target) return null;
                  const dep = deps.find((d) => d.id === target.depId);
                  const RIcon = LINK_ICON[k];
                  return (
                    <button
                      key={k}
                      className="remedy-btn"
                      onClick={() => onApply(target.depId, k)}
                      title={LINK_META[k].hint}
                    >
                      <RIcon size={13} />
                      将 {dep?.name} 改为{LINK_META[k].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {verdict.alternatives.length > 0 && (
            <div className="pair-section">
              <span className="ps-title"><GitFork size={13} /> 已登记的可选替代版本</span>
              <div className="alt-list">
                {verdict.alternatives.map((alt, i) => (
                  <div className="alt-item" key={i}>
                    <div>
                      <b>{alt.name}</b> <span className="alt-ver">{alt.version}</span>
                      <i className="license" style={{ color: licenseById(alt.license).color, background: licenseById(alt.license).color + '18' }}>
                        {alt.license}
                      </i>
                    </div>
                    <p>{alt.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
