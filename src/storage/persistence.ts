import type{Dep,VerdictRecord} from '../types';

const DEPS_KEY='license-lens';
const HISTORY_KEY='license-lens-verdict-history';

export function loadDeps(fallback:Dep[]):Dep[]{
  try{
    const raw=JSON.parse(localStorage.getItem(DEPS_KEY)||'');
    if(!Array.isArray(raw)||!raw.length)return fallback;
    // 迁移旧数据：缺少链接方式字段的一律按动态链接登记
    return raw.map(d=>({linkage:'dynamic',...d}));
  }catch{
    return fallback;
  }
}

export function saveDeps(deps:Dep[]):void{
  localStorage.setItem(DEPS_KEY,JSON.stringify(deps));
}

export function loadHistory():VerdictRecord[]{
  try{
    const raw=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    return Array.isArray(raw)?raw:[];
  }catch{
    return[];
  }
}

export function saveHistory(records:VerdictRecord[]):void{
  localStorage.setItem(HISTORY_KEY,JSON.stringify(records));
}
