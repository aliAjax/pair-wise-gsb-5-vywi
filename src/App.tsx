import{useEffect,useState}from'react';
import{AlertTriangle,ChevronDown,FileCode2,Layers3,Network,ShieldCheck,Sparkles}from'lucide-react';
import{initialDeps,LINKAGE_LABELS}from'./data/licenses';
import{evaluateAll}from'./logic/compatibility';
import{loadDeps,loadHistory,saveDeps,saveHistory}from'./storage/persistence';
import OverviewPage from'./pages/OverviewPage';
import LinkageConsole from'./pages/LinkageConsole';
import type{Dep,Linkage,VerdictRecord}from'./types';

export default function App(){
  const[deps,setDeps]=useState<Dep[]>(()=>loadDeps(initialDeps));
  const[history,setHistory]=useState<VerdictRecord[]>(loadHistory);
  const[view,setView]=useState<'overview'|'console'>('overview');
  useEffect(()=>saveDeps(deps),[deps]);
  useEffect(()=>saveHistory(history),[history]);
  const conflicts=evaluateAll(deps).filter(v=>v.level==='conflict').length;
  const changeLinkage=(id:number,linkage:Linkage)=>{
    const dep=deps.find(d=>d.id===id);
    if(!dep||dep.linkage===linkage)return;
    const before=evaluateAll(deps);
    const next=deps.map(d=>d.id===id?{...d,linkage}:d);
    const after=new Map(evaluateAll(next).map(v=>[v.pairKey,v.level]));
    const records:VerdictRecord[]=before
      .filter(v=>(v.aId===id||v.bId===id)&&after.get(v.pairKey)!==v.level)
      .map((v,i)=>({id:Date.now()+i,at:new Date().toISOString(),trigger:`${dep.name} 链接方式：${LINKAGE_LABELS[dep.linkage]} → ${LINKAGE_LABELS[linkage]}`,pairKey:v.pairKey,aName:v.aName,bName:v.bName,linkage:v.linkage,level:v.level,reason:v.reason}));
    if(records.length)setHistory(h=>[...records,...h]);
    setDeps(next);
  };
  return<div className="shell">
    <aside>
      <div className="brand"><div className="brand-icon"><ShieldCheck size={18}/></div><div><b>License Lens</b><small>dependency clarity</small></div></div>
      <div className="nav-title">WORKSPACE</div>
      <button className={view==='overview'?'nav active':'nav'} onClick={()=>setView('overview')}><Layers3 size={16}/>依赖总览</button>
      <button className={view==='console'?'nav active':'nav'} onClick={()=>setView('console')}><Network size={16}/>链接核验台{conflicts>0&&<span className="red">{conflicts}</span>}</button>
      <button className="nav" onClick={()=>setView('overview')}><FileCode2 size={16}/>许可证清单 <span>{deps.length}</span></button>
      <button className="nav" onClick={()=>setView('console')}><AlertTriangle size={16}/>待处理风险 <span className="red">{deps.filter(d=>d.status==='risk').length}</span></button>
      <div className="aside-bottom">
        <div className="mini-card"><Sparkles size={16}/><div><b>扫描已更新</b><small>刚刚完成 {deps.length} 个依赖的分析</small></div></div>
        <div className="user"><div className="avatar">ZL</div><span>Zen Li</span><ChevronDown size={14}/></div>
      </div>
    </aside>
    {view==='overview'
      ?<main><OverviewPage deps={deps} setDeps={setDeps}/></main>
      :<LinkageConsole deps={deps} history={history} onLinkageChange={changeLinkage} onClearHistory={()=>setHistory([])}/>}
  </div>;
}
