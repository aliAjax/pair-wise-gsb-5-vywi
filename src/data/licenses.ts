import type{Alternative,Dep,LicenseProfile,Linkage} from '../types';

export const LINKAGE_LABELS:Record<Linkage,string>={
  static:'静态链接',
  dynamic:'动态链接',
  plugin:'插件加载',
  process:'进程调用',
};

/** 耦合强度：一对依赖取两者中更弱的一种作为有效链接方式 */
export const LINKAGE_STRENGTH:Record<Linkage,number>={static:3,dynamic:2,plugin:1,process:0};

export const LICENSE_PROFILES:Record<string,LicenseProfile>={
  MIT:{
    copyleft:'none',
    obligations:['保留版权与许可声明'],
    linking:{static:'yes',dynamic:'yes',plugin:'yes',process:'yes'},
  },
  'BSD-3-Clause':{
    copyleft:'none',
    obligations:['再发布保留版权声明','不得使用作者名义背书'],
    linking:{static:'yes',dynamic:'yes',plugin:'yes',process:'yes'},
  },
  'Apache-2.0':{
    copyleft:'none',
    obligations:['保留许可与版权声明','记录重大修改','遵守专利授权条款'],
    linking:{static:'yes',dynamic:'yes',plugin:'yes',process:'yes'},
  },
  'LGPL-2.1':{
    copyleft:'weak',
    obligations:['库本身的修改需开源','允许用户替换该库','随附许可证文本'],
    linking:{static:'conditional',dynamic:'yes',plugin:'conditional',process:'yes'},
  },
  'GPL-3.0':{
    copyleft:'strong',
    obligations:['衍生作品整体按 GPL-3.0 开源','提供对应源代码','随附许可证文本'],
    linking:{static:'no',dynamic:'conditional',plugin:'conditional',process:'yes'},
  },
  Proprietary:{
    copyleft:'closed',
    obligations:['禁止再分发与反向工程','按席位/用量付费','不得与强 copyleft 代码静态合并'],
    linking:{static:'no',dynamic:'conditional',plugin:'conditional',process:'yes'},
  },
};

export const LICENSE_COLORS:Record<string,string>={
  MIT:'#35b995',
  'BSD-3-Clause':'#6d9ee8',
  'Apache-2.0':'#b18ee4',
  'LGPL-2.1':'#e0c06a',
  'GPL-3.0':'#ec8c75',
  Proprietary:'#8a97a5',
};

/** 发生冲突时可建议的替代版本，按包名登记 */
export const ALTERNATIVES:Record<string,Alternative[]>={
  'legacy-parser':[
    {name:'legacy-parser',version:'1.4.2',license:'MIT',note:'切到最后的宽松许可版本'},
    {name:'parsewell',version:'3.2.0',license:'Apache-2.0',note:'API 兼容的替代库'},
  ],
  'analytics-sdk':[
    {name:'analytics-sdk',version:'2.0.3-saas',license:'Proprietary',note:'改为 HTTP 服务调用，进程间隔离'},
  ],
};

export const initialDeps:Dep[]=[
  {id:1,name:'react',version:'18.3.1',license:'MIT',source:'npm',status:'ok',note:'宽松许可，可商用',linkage:'static'},
  {id:2,name:'lodash',version:'4.17.21',license:'MIT',source:'npm',status:'ok',note:'宽松许可，可商用',linkage:'static'},
  {id:3,name:'chart.js',version:'4.4.4',license:'MIT',source:'npm',status:'ok',note:'宽松许可，可商用',linkage:'dynamic'},
  {id:4,name:'highlight.js',version:'11.10.0',license:'BSD-3-Clause',source:'npm',status:'warn',note:'再发布需保留版权声明',linkage:'dynamic'},
  {id:5,name:'legacy-parser',version:'2.1.0',license:'GPL-3.0',source:'手动',status:'risk',note:'可能与闭源分发冲突',linkage:'static'},
  {id:6,name:'analytics-sdk',version:'2.0.3',license:'Proprietary',source:'手动',status:'warn',note:'闭源许可，禁止反向工程',linkage:'static'},
];
