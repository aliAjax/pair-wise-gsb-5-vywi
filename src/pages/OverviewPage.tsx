import{useMemo,useState}from'react';
import type{Dispatch,SetStateAction}from'react';
import{AlertTriangle,Check,ChevronDown,Download,FileCode2,Info,Plus,Search,X}from'lucide-react';
import{LICENSE_COLORS,LICENSE_PROFILES,LINKAGE_LABELS}from'../data/licenses';
import{evaluateAll}from'../logic/compatibility';
import type{Dep,Linkage}from'../types';

const LEVEL_TEXT={ok:'相容',warn:'需注意',conflict:'冲突'}as const;

export default function OverviewPage({deps,setDeps}:{deps:Dep[];setDeps:Dispatch<SetStateAction<Dep[]>>}){
  const[query,setQuery]=useState('');
  const[filter,setFilter]=useState('全部');
  const[selected,setSelected]=useState(1);
  const[showAdd,setShowAdd]=useState(false);
  const[name,setName]=useState('');
  const[license,setLicense]=useState('MIT');
  const[linkage,setLinkage]=useState<Linkage>('dynamic');
  const current=deps.find(d=>d.id===selected);
  const filtered=useMemo(()=>deps.filter(d=>(filter==='全部'||d.status===filter)&&`${d.name}${d.license}`.toLowerCase().includes(query.toLowerCase())),[deps,filter,query]);
  const add=()=>{
    if(!name.trim())return;
    const id=Date.now();
    setDeps(ds=>[...ds,{id,name:name.trim(),version:'1.0.0',license,source:'手动',status:license.startsWith('GPL')?'risk':license==='MIT'?'ok':'warn',note:license==='MIT'?'宽松许可，可商用':license==='Proprietary'?'闭源许可，核对再分发授权':'请核对分发义务',linkage}]);
    setSelected(id);setName('');setShowAdd(false);
  };
  const exportMd=()=>{
    const issues=evaluateAll(deps).filter(v=>v.level!=='ok');
    const text=`# License Lens\n\n| 依赖 | 版本 | 许可证 | 链接方式 | 状态 |\n|---|---|---|---|---|\n${deps.map(d=>`| ${d.name} | ${d.version} | ${d.license} | ${LINKAGE_LABELS[d.linkage]} | ${d.status} |`).join('\n')}\n\n## 链接相容性\n\n${issues.length?issues.map(v=>`- **${v.aName} × ${v.bName}**（${LINKAGE_LABELS[v.linkage]} · ${LEVEL_TEXT[v.level]}）：${v.reason}`).join('\n'):'全部组合相容。'}`;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));
    a.download='license-report.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return<>
    <header>
      <div>
        <div className="crumb">WORKSPACE / <b>PROJECT SCAN</b></div>
        <h1>许可证兼容性分析</h1>
        <p>检查依赖许可，放心发布你的项目。</p>
      </div>
      <div className="head-actions">
        <button className="outline" onClick={exportMd}><Download size={15}/>导出报告</button>
        <button className="primary" onClick={()=>setShowAdd(true)}><Plus size={16}/>添加依赖</button>
      </div>
    </header>
    <section className="hero">
      <div>
        <span className="tag">PROJECT · AURORA-WEB</span>
        <h2>发布前，再确认一次。</h2>
        <p>我们扫描了 <b>{deps.length} 个依赖</b>，发现 <b className="warning">{deps.filter(d=>d.status!=='ok').length} 个项目</b>需要你的关注。</p>
      </div>
      <div className="scan-score">
        <div className="score-ring"><strong>{Math.round(deps.filter(d=>d.status==='ok').length/deps.length*100)}<small>%</small></strong></div>
        <div><span>兼容评分</span><b>良好</b><small>上次扫描 2 分钟前</small></div>
      </div>
    </section>
    <section className="summary">
      <div><span>全部依赖</span><b>{deps.length}</b><small>+2 本次新增</small></div>
      <div><span>安全许可</span><b className="teal">{deps.filter(d=>d.status==='ok').length}</b><small>可直接分发</small></div>
      <div><span>需要复核</span><b className="orange">{deps.filter(d=>d.status==='warn').length}</b><small>保留声明即可</small></div>
      <div><span>高风险</span><b className="red">{deps.filter(d=>d.status==='risk').length}</b><small>建议替换或隔离</small></div>
    </section>
    <section className="workspace">
      <div className="table-pane">
        <div className="pane-head">
          <div><h2>依赖清单</h2><p>逐项查看许可证义务</p></div>
          <div className="tools">
            <div className="search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索依赖"/></div>
            <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="全部">全部状态</option><option value="ok">安全</option><option value="warn">复核</option><option value="risk">高风险</option></select>
          </div>
        </div>
        <div className="table">
          <div className="tr th"><span>依赖名称</span><span>版本</span><span>许可证</span><span>状态</span></div>
          {filtered.map(d=><button className={d.id===selected?'tr selected':'tr'} key={d.id} onClick={()=>setSelected(d.id)}>
            <span className="dep-name"><span className="pkg-dot"/> {d.name}</span>
            <span className="muted">{d.version}</span>
            <span><i className="license" style={{color:LICENSE_COLORS[d.license]||'#888',background:(LICENSE_COLORS[d.license]||'#888')+'18'}}>{d.license}</i></span>
            <span className={'status '+d.status}>{d.status==='ok'?<Check size={13}/>:<AlertTriangle size={13}/>} {d.status==='ok'?'安全':d.status==='warn'?'复核':'高风险'}</span>
          </button>)}
        </div>
      </div>
      {current&&<div className="detail">
        <div className="detail-head">
          <div className="detail-icon" style={{background:(LICENSE_COLORS[current.license]||'#888')+'1c',color:LICENSE_COLORS[current.license]}}><FileCode2 size={20}/></div>
          <div><span>SELECTED DEPENDENCY</span><h2>{current.name}</h2></div>
          <button className="close" onClick={()=>setSelected(0)}><X size={16}/></button>
        </div>
        <div className="detail-grid">
          <div><label>版本</label><b>{current.version}</b></div>
          <div><label>来源</label><b>{current.source}</b></div>
          <div><label>许可证</label><b>{current.license}</b></div>
          <div><label>链接方式</label><b>{LINKAGE_LABELS[current.linkage]}</b></div>
        </div>
        <div className={'finding '+current.status}>
          <div className="finding-icon">{current.status==='ok'?<Check size={16}/>:<AlertTriangle size={16}/>}</div>
          <div><b>{current.status==='ok'?'可以放心使用':current.status==='warn'?'需要保留声明':'存在分发限制'}</b><p>{current.note}。扫描结果基于 package 元数据，请在发布前查看完整许可证文本。</p></div>
        </div>
        <div className="full-license">
          <div><Info size={15}/><span>许可证摘要</span></div>
          <p>{current.license} 允许在满足其条款的前提下使用和分发代码。详细义务请参考项目仓库中的 LICENSE 文件。</p>
          <div className="obl-chips">{(LICENSE_PROFILES[current.license]?.obligations||['该许可证义务未登记，需人工核对']).map(o=><span className="obl-chip" key={o}>{o}</span>)}</div>
          <button>查看原文 <ChevronDown size={14}/></button>
        </div>
      </div>}
    </section>
    {showAdd&&<div className="backdrop" onClick={()=>setShowAdd(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><h2>添加依赖</h2><button onClick={()=>setShowAdd(false)}>×</button></div>
        <label>依赖名称<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="例如 date-fns"/></label>
        <label>许可证<select value={license} onChange={e=>setLicense(e.target.value)}><option>MIT</option><option>BSD-3-Clause</option><option>Apache-2.0</option><option>LGPL-2.1</option><option>GPL-3.0</option><option>Proprietary</option></select></label>
        <label>链接方式<select value={linkage} onChange={e=>setLinkage(e.target.value as Linkage)}>{Object.entries(LINKAGE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <button className="primary full" onClick={add}>加入扫描</button>
      </div>
    </div>}
  </>;
}
