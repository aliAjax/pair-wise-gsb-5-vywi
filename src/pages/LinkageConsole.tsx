import{useMemo}from'react';
import{History,Scale,ShieldAlert,ShieldCheck,ShieldX}from'lucide-react';
import{LICENSE_COLORS,LICENSE_PROFILES,LINKAGE_LABELS}from'../data/licenses';
import{evaluateAll}from'../logic/compatibility';
import type{Dep,Linkage,VerdictRecord}from'../types';

const LEVEL_TEXT={ok:'相容',warn:'需注意',conflict:'冲突'}as const;
const LEVEL_ICON={ok:<ShieldCheck size={11}/>,warn:<ShieldAlert size={11}/>,conflict:<ShieldX size={11}/>};
const RANK={conflict:0,warn:1,ok:2}as const;

export default function LinkageConsole({deps,history,onLinkageChange,onClearHistory}:{deps:Dep[];history:VerdictRecord[];onLinkageChange:(id:number,linkage:Linkage)=>void;onClearHistory:()=>void}){
  const verdicts=useMemo(()=>evaluateAll(deps).sort((x,y)=>RANK[x.level]-RANK[y.level]),[deps]);
  const issues=verdicts.filter(v=>v.level!=='ok');
  const okCount=verdicts.length-issues.length;
  const warnCount=verdicts.filter(v=>v.level==='warn').length;
  const conflictCount=verdicts.filter(v=>v.level==='conflict').length;
  return<main>
    <header>
      <div>
        <div className="crumb">WORKSPACE / <b>LINKAGE CONSOLE</b></div>
        <h1>链接方式核验台</h1>
        <p>登记每个依赖的许可证义务与集成方式，核验同一产物内两两组合是否相容。</p>
      </div>
    </header>
    <section className="summary">
      <div><span>登记依赖</span><b>{deps.length}</b><small>均已标记链接方式</small></div>
      <div><span>相容组合</span><b className="teal">{okCount}</b><small>共 {verdicts.length} 对组合</small></div>
      <div><span>需注意</span><b className="orange">{warnCount}</b><small>履行义务后可共存</small></div>
      <div><span>冲突</span><b className="red">{conflictCount}</b><small>需替换或调整链接方式</small></div>
    </section>
    <section className="console-grid">
      <div className="linkage-pane">
        <div className="pane-head"><div><h2>链接方式登记</h2><p>调整后立即重新计算全部组合裁决</p></div></div>
        <div className="link-row head"><span>依赖</span><span>许可证</span><span>登记义务</span><span>链接方式</span></div>
        {deps.map(d=>{
          const profile=LICENSE_PROFILES[d.license];
          return<div className="link-row" key={d.id}>
            <span className="link-name"><b>{d.name}</b><small>{d.version} · {d.source}</small></span>
            <span><i className="license" style={{color:LICENSE_COLORS[d.license]||'#888',background:(LICENSE_COLORS[d.license]||'#888')+'18'}}>{d.license}</i></span>
            <span className="obl-chips">{profile?profile.obligations.map(o=><span className="obl-chip" key={o}>{o}</span>):<span className="obl-chip">未登记，需人工核对</span>}</span>
            <span><select className="link-select" value={d.linkage} onChange={e=>onLinkageChange(d.id,e.target.value as Linkage)}>
              {Object.entries(LINKAGE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select></span>
          </div>;
        })}
      </div>
      <div className="verdict-pane">
        <div className="pane-head">
          <div><h2>相容性裁决</h2><p>{issues.length?`${issues.length} 对组合需要处理，其余 ${okCount} 对相容`:'全部组合相容'}</p></div>
          <Scale size={16} color="#9aa7ab"/>
        </div>
        <div className="verdict-list">
          {issues.map(v=><div className={'verdict '+v.level} key={v.pairKey}>
            <div className="verdict-head">
              <b>{v.aName}</b><span className="vs">×</span><b>{v.bName}</b>
              <span className="linkage-chip">{LINKAGE_LABELS[v.linkage]}</span>
              <span className={'level-badge '+v.level}>{LEVEL_ICON[v.level]}{LEVEL_TEXT[v.level]}</span>
            </div>
            <p>{v.reason}</p>
            {v.obligations.length>0&&<div><label>触发义务</label><div className="obl-chips">{v.obligations.map(o=><span className="obl-chip" key={o}>{o}</span>)}</div></div>}
            {v.alternatives.length>0&&<div><label>可选替代版本</label>{v.alternatives.map(a=><div className="alt-item" key={a.name+a.version}><b>{a.name}@{a.version}</b><i>{a.license}</i><small>{a.note}</small></div>)}</div>}
          </div>)}
          {issues.length===0&&<div className="empty">当前链接方式下全部组合相容</div>}
        </div>
        <div className="history">
          <div className="pane-head">
            <div><h2>历史裁决</h2><p>调整链接方式前的旧裁决保留在此</p></div>
            {history.length>0&&<button className="text-btn" onClick={onClearHistory}><History size={12}/>清空</button>}
          </div>
          {history.length===0&&<div className="empty">暂无历史裁决，调整链接方式后自动保留旧结果</div>}
          {history.map(r=><div className="history-item" key={r.id}>
            <span className={'level-badge '+r.level}>{LEVEL_ICON[r.level]}{LEVEL_TEXT[r.level]}</span>
            <div>
              <b>{r.aName} × {r.bName}</b>
              <p>{r.reason}</p>
              <small>{r.trigger} · {new Date(r.at).toLocaleString('zh-CN',{hour12:false})}</small>
            </div>
          </div>)}
        </div>
      </div>
    </section>
  </main>;
}
