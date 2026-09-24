export type Linkage='static'|'dynamic'|'plugin'|'process';
export type Status='ok'|'warn'|'risk';

export interface Dep{
  id:number;
  name:string;
  version:string;
  license:string;
  source:string;
  status:Status;
  note:string;
  linkage:Linkage;
}

export interface LicenseProfile{
  obligations:string[];
  copyleft:'none'|'weak'|'strong'|'closed';
  /** 与异质许可代码共存时，各链接方式是否被该许可允许 */
  linking:Record<Linkage,'yes'|'conditional'|'no'>;
}

export interface Alternative{
  name:string;
  version:string;
  license:string;
  note:string;
}

export type VerdictLevel='ok'|'warn'|'conflict';

export interface Verdict{
  pairKey:string;
  aId:number;
  bId:number;
  aName:string;
  bName:string;
  linkage:Linkage;
  level:VerdictLevel;
  reason:string;
  obligations:string[];
  alternatives:Alternative[];
}

/** 调整链接方式后被替换掉的旧裁决，保留备查 */
export interface VerdictRecord{
  id:number;
  at:string;
  trigger:string;
  pairKey:string;
  aName:string;
  bName:string;
  linkage:Linkage;
  level:VerdictLevel;
  reason:string;
}
