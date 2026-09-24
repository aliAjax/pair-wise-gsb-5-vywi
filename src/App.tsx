import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileCode2,
  History,
  Info,
  Layers3,
  Link2,
  ListChecks,
  Plus,
  Plug,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  LEVEL_META,
  LICENSES,
  LINK_META,
  licenseById,
  type Dep,
  type Level,
  type LinkKind,
} from './data/catalog';
import { initialDeps } from './data/dependencies';
import { evaluateAll, levelRank, makeRuling, type Ruling } from './rules/engine';
import { appendRuling, loadDeps, loadRulings, saveDeps } from './storage/store';
import PairCard from './ui/PairCard';
import HistoryPanel from './ui/HistoryPanel';
import AddDepModal from './ui/AddDepModal';

const LINK_ICON: Record<LinkKind, typeof Boxes> = {
  static: Boxes,
  dynamic: Link2,
  plugin: Plug,
  process: Terminal,
};

type PairFilter = 'all' | Level;

const STATUS_OF_LEVEL: Record<Level, 'ok' | 'warn' | 'risk'> = {
  pass: 'ok',
  notice: 'ok',
  warn: 'warn',
  block: 'risk',
};

export default function App() {
  const [deps, setDeps] = useState<Dep[]>(() => loadDeps(initialDeps));
  const [history, setHistory] = useState<Ruling[]>(() => loadRulings());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [pairFilter, setPairFilter] = useState<PairFilter>('all');
  const [selected, setSelected] = useState<number | null>(initialDeps[0]?.id ?? null);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => saveDeps(deps), [deps]);

  const result = useMemo(() => evaluateAll(deps), [deps]);
  const current = deps.find((d) => d.id === selected) ?? null;
  const lastRuling = history[history.length - 1];

  // 每个依赖当前涉及的最差裁决，用于清单状态列（由组合裁决派生）
  const worstByDep = useMemo(() => {
    const map = new Map<number, Level>();
    deps.forEach((d) => map.set(d.id, 'pass'));
    result.verdicts.forEach((v) => {
      if (levelRank[v.level] > levelRank[map.get(v.aId)!]) map.set(v.aId, v.level);
      if (levelRank[v.level] > levelRank[map.get(v.bId)!]) map.set(v.bId, v.level);
    });
    return map;
  }, [deps, result]);

  const filteredDeps = useMemo(
    () =>
      deps.filter((d) => {
        const lv = worstByDep.get(d.id) ?? 'pass';
        const st = STATUS_OF_LEVEL[lv];
        return (
          (statusFilter === '全部' || st === statusFilter) &&
          `${d.name}${d.license}`.toLowerCase().includes(query.toLowerCase())
        );
      }),
    [deps, query, statusFilter, worstByDep],
  );

  const visiblePairs = useMemo(
    () => (pairFilter === 'all' ? result.verdicts : result.verdicts.filter((v) => v.level === pairFilter)),
    [result, pairFilter],
  );

  const score = deps.length
    ? Math.round(
        (result.verdicts.filter((v) => v.level === 'pass' || v.level === 'notice').length /
          Math.max(1, result.pairCount)) *
          100,
      )
    : 100;

  // —— 调整动作 ——
  const touch = (fn: (ds: Dep[]) => Dep[]) => {
    setDeps(fn);
    setDirty(true);
  };

  const changeLink = (id: number, kind: LinkKind) =>
    touch((ds) => ds.map((d) => (d.id === id ? { ...d, linkKind: kind } : d)));

  const removeDep = (id: number) =>
    touch((ds) => ds.filter((d) => d.id !== id));

  const addDep = (input: { name: string; license: string; linkKind: LinkKind }) => {
    const id = Date.now();
    touch((ds) => [
      ...ds,
      {
        id,
        name: input.name,
        version: '1.0.0',
        license: input.license,
        source: '手动',
        linkKind: input.linkKind,
        note: '法务新增登记，待补充版本与来源',
      },
    ]);
    setSelected(id);
    setShowAdd(false);
  };

  const archiveRuling = () => {
    const ruling = makeRuling(deps);
    setHistory(appendRuling(ruling));
    setDirty(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  const exportMd = () => {
    const depRows = deps
      .map((d) => `| ${d.name} | ${d.version} | ${licenseById(d.license).label} | ${LINK_META[d.linkKind].label} |`)
      .join('\n');
    const conflictRows = result.verdicts
      .filter((v) => v.level === 'block' || v.level === 'warn')
      .map((v) => {
        const a = deps.find((d) => d.id === v.aId)!;
        const b = deps.find((d) => d.id === v.bId)!;
        return `| ${a.name} ↔ ${b.name} | ${LEVEL_META[v.level].label} | ${v.title} | ${v.triggered.join('；')} |`;
      })
      .join('\n');
    const text = `# License Lens · 链接方式核验报告

总体裁决：**${LEVEL_META[result.overall].label}**（${result.pairCount} 对组合）

## 依赖登记与链接方式

| 依赖 | 版本 | 许可证 | 链接方式 |
|---|---|---|---|
${depRows}

## 冲突与待办

| 冲突双方 | 等级 | 触发义务/说明 | 详情 |
|---|---|---|---|
${conflictRows || '| — | — | 无未决冲突 |'}

${history.length ? `已存档裁决 ${history.length} 份，最新：${lastRuling?.id}` : ''}
`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    a.download = 'linking-verification.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const levelChips: { key: PairFilter; label: string; count: number }[] = [
    { key: 'all', label: '全部组合', count: result.pairCount },
    { key: 'block', label: '冲突', count: result.counts.block },
    { key: 'warn', label: '需豁免/改造', count: result.counts.warn },
    { key: 'notice', label: '提示', count: result.counts.notice },
    { key: 'pass', label: '相容', count: result.counts.pass },
  ];

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brand-icon"><ShieldCheck size={18} /></div>
          <div><b>License Lens</b><small>dependency clarity</small></div>
        </div>
        <div className="nav-title">WORKSPACE</div>
        <button className="nav active"><Layers3 size={16} />依赖总览</button>
        <button className="nav"><ClipboardCheck size={16} />链接方式核验台 <span>{result.counts.block + result.counts.warn}</span></button>
        <button className="nav" onClick={() => setShowHistory(true)}>
          <History size={16} />裁决存档 <span>{history.length}</span>
        </button>
        <button className="nav">
          <AlertTriangle size={16} />待处理冲突
          <span className="red">{result.counts.block + result.counts.warn}</span>
        </button>
        <div className="aside-bottom">
          <div className="mini-card">
            <Sparkles size={16} />
            <div>
              <b>{dirty ? '链接方式已调整，待重新核验' : '核验台为最新'}</b>
              <small>{dirty ? '重算结果即时可见，确认后请存档' : `共 ${deps.length} 个依赖 · ${result.pairCount} 对组合`}</small>
            </div>
          </div>
          <div className="user">
            <div className="avatar">ZL</div>
            <span>Zen Li</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="crumb">WORKSPACE / <b>LINKING VERIFICATION</b></div>
            <h1>链接方式核验台</h1>
            <p>登记每个依赖的许可证义务与链接方式，判断两个包放进同一产物后是否相容。</p>
          </div>
          <div className="head-actions">
            <button className="outline" onClick={() => setShowHistory(true)}>
              <History size={15} />裁决存档
            </button>
            <button className="outline" onClick={exportMd}><Download size={15} />导出报告</button>
            <button className="primary" onClick={archiveRuling}>
              {savedFlash ? <Check size={16} /> : <Save size={15} />}
              {savedFlash ? '已存档新裁决' : '重新核验并存档'}
            </button>
          </div>
        </header>

        <section className="hero">
          <div>
            <span className="tag">PROJECT · AURORA-WEB · 同一产物分发</span>
            <h2>{result.counts.block > 0 ? '存在不能共存的组合，发布前必须处置。' : result.counts.warn > 0 ? '组合基本可行，有义务待落实。' : '全部组合相容，可以发布。'}</h2>
            <p>
              共核验 <b>{result.pairCount} 对组合</b>：
              <b className="danger">{result.counts.block} 对冲突</b>、
              <b className="warning">{result.counts.warn} 对需改造</b>、
              <b>{result.counts.notice} 对附义务提示</b>。
              {dirty && <b className="recheck"> 链接方式有调整，结果已即时重算（尚未存档）。</b>}
            </p>
          </div>
          <div className="scan-score">
            <div
              className="score-ring"
              style={{ borderColor: score >= 80 ? '#39b294' : score >= 50 ? '#da9a57' : '#d66c5e', borderLeftColor: '#496267' }}
            >
              <strong>{score}<small>%</small></strong>
            </div>
            <div>
              <span>组合相容率</span>
              <b>{LEVEL_META[result.overall].label}</b>
              <small>{lastRuling ? `上次存档 ${lastRuling.id}` : '尚无存档裁决'}</small>
            </div>
          </div>
        </section>

        <section className="summary">
          <div><span>登记依赖</span><b>{deps.length}</b><small>每个依赖登记链接方式</small></div>
          <div><span>相容/附提示</span><b className="teal">{result.counts.pass + result.counts.notice}</b><small>履行声明义务即可</small></div>
          <div><span>需豁免/改造</span><b className="orange">{result.counts.warn}</b><small>调整链接方式或取得例外</small></div>
          <div><span>冲突（不可共存）</span><b className="red">{result.counts.block}</b><small>GPL 静态 × 闭源等</small></div>
        </section>

        <section className="console-section">
          <div className="section-head">
            <div>
              <h2><ClipboardCheck size={16} /> 组合核验结果</h2>
              <p>静态链接 · 动态链接 · 插件加载 · 进程调用 四种方式逐对判定；冲突给出双方、触发义务与替代版本。</p>
            </div>
            <div className="pair-filter">
              {levelChips.map((c) => (
                <button
                  key={c.key}
                  className={pairFilter === c.key ? `pf active pf-${c.key}` : `pf pf-${c.key}`}
                  onClick={() => setPairFilter(c.key)}
                >
                  {c.label} <span>{c.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pair-list">
            {visiblePairs.length === 0 && (
              <div className="pairs-empty">该等级下没有组合对</div>
            )}
            {visiblePairs.map((v) => (
              <PairCard key={v.key} verdict={v} deps={deps} onApply={changeLink} />
            ))}
          </div>
        </section>

        <section className="workspace">
          <div className="table-pane">
            <div className="pane-head">
              <div>
                <h2>依赖清单与链接登记</h2>
                <p>为每个依赖登记许可证义务，并标记链接方式</p>
              </div>
              <div className="tools">
                <div className="search">
                  <Search size={15} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索依赖" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="全部">全部状态</option>
                  <option value="ok">安全</option>
                  <option value="warn">复核</option>
                  <option value="risk">高风险</option>
                </select>
                <button className="mini-add" onClick={() => setShowAdd(true)}><Plus size={14} /></button>
              </div>
            </div>
            <div className="table table-link">
              <div className="tr th">
                <span>依赖名称</span><span>许可证</span><span>链接方式</span><span>组合裁决</span>
              </div>
              {filteredDeps.map((d) => {
                const lv = worstByDep.get(d.id) ?? 'pass';
                const st = STATUS_OF_LEVEL[lv];
                const p = licenseById(d.license);
                const LIcon = LINK_ICON[d.linkKind];
                return (
                  <button
                    className={d.id === selected ? 'tr selected' : 'tr'}
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                  >
                    <span className="dep-name">
                      <span className="pkg-dot" style={{ background: p.color }} /> {d.name}
                      <small className="ver-inline">{d.version}</small>
                    </span>
                    <span>
                      <i className="license" style={{ color: p.color, background: p.color + '18' }}>{p.label}</i>
                    </span>
                    <span>
                      <em className={`lk lk-${d.linkKind}`}><LIcon size={11} /> {LINK_META[d.linkKind].short}</em>
                    </span>
                    <span className={'status ' + st}>
                      {st === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />}
                      {LEVEL_META[lv].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {current && (
            <div className="detail">
              <div className="detail-head">
                <div
                  className="detail-icon"
                  style={{ background: (licenseById(current.license).color) + '1c', color: licenseById(current.license).color }}
                >
                  <FileCode2 size={20} />
                </div>
                <div>
                  <span>SELECTED DEPENDENCY</span>
                  <h2>{current.name}</h2>
                </div>
                <button className="close" onClick={() => setSelected(null)}><X size={16} /></button>
              </div>

              <div className="detail-grid">
                <div><label>版本</label><b>{current.version}</b></div>
                <div><label>来源</label><b>{current.source}</b></div>
                <div><label>许可证</label><b>{licenseById(current.license).label}</b></div>
              </div>

              <div className="link-editor">
                <label>链接方式（调整后整台立即重算）</label>
                <div className="link-options">
                  {(Object.keys(LINK_META) as LinkKind[]).map((k) => {
                    const I = LINK_ICON[k];
                    return (
                      <button
                        key={k}
                        className={current.linkKind === k ? `lo active lo-${k}` : `lo lo-${k}`}
                        onClick={() => changeLink(current.id, k)}
                        title={LINK_META[k].hint}
                      >
                        <I size={14} /> {LINK_META[k].label}
                      </button>
                    );
                  })}
                </div>
                <p className="link-hint"><Info size={12} /> {LINK_META[current.linkKind].hint}</p>
              </div>

              <div className={`finding ${STATUS_OF_LEVEL[worstByDep.get(current.id) ?? 'pass']}`}>
                <div className="finding-icon">
                  {(worstByDep.get(current.id) ?? 'pass') === 'pass' ||
                  (worstByDep.get(current.id) ?? 'pass') === 'notice' ? (
                    <Check size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>
                <div>
                  <b>
                    与其它依赖组合最差裁决：
                    <span style={{ color: LEVEL_META[worstByDep.get(current.id) ?? 'pass'].color }}>
                      {LEVEL_META[worstByDep.get(current.id) ?? 'pass'].label}
                    </span>
                  </b>
                  <p>{current.note ?? '无额外备注'}。完整义务以项目仓库 LICENSE 与采购合同为准。</p>
                </div>
              </div>

              <div className="full-license">
                <div><ListChecks size={15} /><span>{licenseById(current.license).label} · 分发义务登记</span></div>
                <ul className="obligations">
                  {licenseById(current.license).obligations.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>

              {current.alternatives && current.alternatives.length > 0 && (
                <div className="full-license">
                  <div><RotateCcw size={15} /><span>法务登记的可选替代版本</span></div>
                  {current.alternatives.map((alt, i) => (
                    <p className="alt-line" key={i}>
                      <b>{alt.name} {alt.version}</b>（{alt.license}）— {alt.reason}
                    </p>
                  ))}
                </div>
              )}

              <button className="remove-btn" onClick={() => removeDep(current.id)}>
                <Trash2 size={13} /> 移出本次核验
              </button>
            </div>
          )}
        </section>
      </main>

      {showAdd && <AddDepModal onClose={() => setShowAdd(false)} onAdd={addDep} />}
      <HistoryPanel open={showHistory} history={history} activeId={lastRuling?.id} onClose={() => setShowHistory(false)} />

      {dirty && (
        <div className="save-bar">
          <Upload size={14} />
          链接方式已调整，核验结果已重新计算。
          <button className="primary sm" onClick={archiveRuling}>
            {savedFlash ? <Check size={14} /> : <Save size={14} />}
            {savedFlash ? '已存档' : '确认并保留为新裁决'}
          </button>
          <span className="save-note">旧裁决仍可在“裁决存档”中查阅，不会被覆盖。</span>
        </div>
      )}
    </div>
  );
}
