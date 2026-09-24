import{ALTERNATIVES,LICENSE_PROFILES,LINKAGE_STRENGTH} from '../data/licenses';
import type{Alternative,Dep,Linkage,Verdict} from '../types';

export const pairKey=(x:number,y:number)=>[x,y].sort((a,b)=>a-b).join(':');

/** 一对依赖的有效链接方式：取两者中耦合更弱的一种（一方独立进程，双方即只能靠进程通信） */
export function effectiveLinkage(a:Linkage,b:Linkage):Linkage{
  return LINKAGE_STRENGTH[a]<=LINKAGE_STRENGTH[b]?a:b;
}

function alternativesFor(...deps:Dep[]):Alternative[]{
  const found=deps.flatMap(d=>ALTERNATIVES[d.name]||[]);
  if(found.length)return found;
  return deps
    .filter(d=>{const p=LICENSE_PROFILES[d.license];return p&&(p.copyleft==='strong'||p.copyleft==='closed')})
    .map(d=>({name:d.name,version:'—',license:'MIT / BSD / Apache-2.0',note:'换用宽松许可实现，或改为进程调用隔离'}));
}

export function evaluatePair(a:Dep,b:Dep):Verdict{
  const linkage=effectiveLinkage(a.linkage,b.linkage);
  const pa=LICENSE_PROFILES[a.license];
  const pb=LICENSE_PROFILES[b.license];
  const base={pairKey:pairKey(a.id,b.id),aId:a.id,bId:b.id,aName:a.name,bName:b.name,linkage,obligations:[] as string[],alternatives:[] as Alternative[]};
  if(!pa||!pb){
    return{...base,level:'warn',reason:`存在未登记的许可证（${!pa?a.license:b.license}），无法自动判定`,obligations:['人工核对完整许可证文本']};
  }
  if(linkage==='process'){
    return{...base,level:'ok',reason:'分属独立进程，仅以进程调用通信，不构成衍生作品，双方义务互不外溢'};
  }
  const strong=pa.copyleft==='strong'?a:pb.copyleft==='strong'?b:null;
  const closed=pa.copyleft==='closed'?a:pb.copyleft==='closed'?b:null;
  const weak=pa.copyleft==='weak'?a:pb.copyleft==='weak'?b:null;

  if(pa.copyleft==='strong'&&pb.copyleft==='strong'){
    return{...base,level:'ok',reason:'双方同为 GPL 系许可，义务一致，可合并分发',obligations:pa.obligations};
  }
  if(strong&&closed){
    const sProfile=LICENSE_PROFILES[strong.license];
    const cProfile=LICENSE_PROFILES[closed.license];
    if(linkage==='static'){
      return{...base,level:'conflict',
        reason:`${strong.name}（${strong.license}）与闭源组件 ${closed.name} 静态链接为同一产物，构成衍生作品，双方许可互斥`,
        obligations:[...sProfile.obligations,...cProfile.obligations],
        alternatives:alternativesFor(strong,closed)};
    }
    if(linkage==='dynamic'){
      return{...base,level:'warn',
        reason:`${strong.license} 与闭源组件动态链接是否构成衍生作品存在争议，主流解读倾向从严`,
        obligations:sProfile.obligations,
        alternatives:alternativesFor(strong,closed)};
    }
    return{...base,level:'conflict',
      reason:`插件组合需双方许可均允许：${strong.license} 要求插件整体开源，${closed.name} 的闭源许可不允许`,
      obligations:[...sProfile.obligations,...cProfile.obligations],
      alternatives:alternativesFor(strong,closed)};
  }
  if(linkage==='plugin'){
    const aAllow=pa.linking.plugin,bAllow=pb.linking.plugin;
    if(aAllow==='no'||bAllow==='no'){
      const blocker=aAllow==='no'?a:b;
      return{...base,level:'conflict',
        reason:`插件组合需双方允许，${blocker.name}（${blocker.license}）不允许以插件形式加载异质许可代码`,
        obligations:LICENSE_PROFILES[blocker.license].obligations,
        alternatives:alternativesFor(a,b)};
    }
    if(aAllow==='conditional'||bAllow==='conditional'){
      return{...base,level:'warn',reason:'插件加载触及许可边界，需双方条款均明确允许后方可组合',obligations:[...pa.obligations,...pb.obligations]};
    }
    return{...base,level:'ok',reason:'双方许可均允许插件式组合，各自保留声明即可',obligations:[...pa.obligations,...pb.obligations]};
  }
  if(strong){
    const sProfile=LICENSE_PROFILES[strong.license];
    return{...base,level:'warn',
      reason:linkage==='static'
        ?`${strong.name}（${strong.license}）静态合并后，整个产物须按 ${strong.license} 开源`
        :`动态链接 ${strong.license} 库通常使整体受其约束，建议隔离或替换`,
      obligations:sProfile.obligations,
      alternatives:alternativesFor(strong)};
  }
  if(weak){
    const wProfile=LICENSE_PROFILES[weak.license];
    if(linkage==='static'){
      return{...base,level:'warn',reason:`静态链接 ${weak.license} 库，需提供可重新链接的目标文件或对应源码`,obligations:wProfile.obligations};
    }
    return{...base,level:'ok',reason:`动态链接满足 ${weak.license} 要求，注意允许用户替换该库`,obligations:['允许用户替换该库']};
  }
  if(closed){
    const cProfile=LICENSE_PROFILES[closed.license];
    if(linkage==='static'){
      return{...base,level:'warn',reason:`闭源组件 ${closed.name} 静态并入产物，需确认其授权允许随产物再分发`,obligations:cProfile.obligations};
    }
    return{...base,level:'ok',reason:'动态链接闭源组件，按席位授权即可，注意不得反向工程',obligations:cProfile.obligations};
  }
  return{...base,level:'ok',reason:'双方均为宽松许可，各自保留版权与许可声明即可',obligations:[...pa.obligations,...pb.obligations]};
}

export function evaluateAll(deps:Dep[]):Verdict[]{
  const out:Verdict[]=[];
  for(let i=0;i<deps.length;i++)for(let j=i+1;j<deps.length;j++)out.push(evaluatePair(deps[i],deps[j]));
  return out;
}
