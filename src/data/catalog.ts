// 资料层：许可证档案与静态元数据（只登记事实，不做相容性判断）

export type LinkKind = 'static' | 'dynamic' | 'plugin' | 'process';
export type Level = 'pass' | 'notice' | 'warn' | 'block';
export type Copyleft =
  | 'none'
  | 'weak-lgpl'
  | 'weak-mpl'
  | 'gpl2'
  | 'gpl3'
  | 'agpl';

export interface Alternative {
  name: string;
  version: string;
  license: string;
  reason: string;
}

export interface Dep {
  id: number;
  name: string;
  version: string;
  /** 对应 LICENSES 中的许可证 id；闭源包用 Proprietary */
  license: string;
  source: string;
  linkKind: LinkKind;
  note?: string;
  /** 冲突时法务登记的可选替代版本 */
  alternatives?: Alternative[];
}

export interface LicenseProfile {
  id: string;
  label: string;
  spdx: string | null;
  color: string;
  copyleft: Copyleft;
  proprietary?: boolean;
  /** 该许可证在分发同一产物时需要履行的义务（登记资料） */
  obligations: string[];
}

export const LINK_META: Record<
  LinkKind,
  { label: string; short: string; hint: string }
> = {
  static: {
    label: '静态链接',
    short: '静态',
    hint: '代码被编译/打包进同一产物（合并作品，著作权口径最严）',
  },
  dynamic: {
    label: '动态链接',
    short: '动态',
    hint: '运行时加载共享库（.so/.dll），与主程序在同一进程地址空间',
  },
  plugin: {
    label: '插件加载',
    short: '插件',
    hint: '宿主在运行时按插件接口加载，组合需双方许可证明确允许',
  },
  process: {
    label: '进程调用',
    short: '进程',
    hint: '以独立进程经 IPC / 管道 / 命令行协作，通常构成“聚合”',
  },
};

export const LEVEL_META: Record<
  Level,
  { label: string; color: string; bg: string }
> = {
  pass: { label: '相容', color: '#159e7e', bg: '#ecfaf5' },
  notice: { label: '提示', color: '#3d7fc4', bg: '#eef4fb' },
  warn: { label: '需豁免/改造', color: '#c78a43', bg: '#fff7eb' },
  block: { label: '冲突', color: '#d16c5e', bg: '#fff1ef' },
};

export const LICENSES: LicenseProfile[] = [
  {
    id: 'MIT',
    label: 'MIT',
    spdx: 'MIT',
    color: '#35b995',
    copyleft: 'none',
    obligations: ['再发布须保留版权声明与 MIT 许可证全文', '许可证文本须随二进制分发一并提供'],
  },
  {
    id: 'ISC',
    label: 'ISC',
    spdx: 'ISC',
    color: '#3bbfa8',
    copyleft: 'none',
    obligations: ['再发布须保留版权声明与 ISC 许可证全文'],
  },
  {
    id: 'BSD-2-Clause',
    label: 'BSD-2-Clause',
    spdx: 'BSD-2-Clause',
    color: '#6d9ee8',
    copyleft: 'none',
    obligations: ['保留版权声明与许可证全文', '二进制再发布须随附上述声明'],
  },
  {
    id: 'BSD-3-Clause',
    label: 'BSD-3-Clause',
    spdx: 'BSD-3-Clause',
    color: '#6d9ee8',
    copyleft: 'none',
    obligations: [
      '保留版权声明与许可证全文',
      '二进制再发布须随附上述声明',
      '广告材料须保留致谢声明',
      '未经书面许可不得用贡献者名义为衍生产品背书',
    ],
  },
  {
    id: 'Apache-2.0',
    label: 'Apache-2.0',
    spdx: 'Apache-2.0',
    color: '#b18ee4',
    copyleft: 'none',
    obligations: [
      '保留版权声明、许可证全文与 NOTICE 文件内容',
      '修改过的文件须标注变更说明',
      '专利授权条款随分发生效，不得对使用者发起专利诉讼',
    ],
  },
  {
    id: 'LGPL-2.1',
    label: 'LGPL-2.1',
    spdx: 'LGPL-2.1',
    color: '#5aa7d6',
    copyleft: 'weak-lgpl',
    obligations: [
      '保留版权声明与 LGPL 许可证全文',
      '静态链接闭源代码时须提供目标文件/可重新链接材料，允许用户替换库版本',
      '对库本体的修改须以 LGPL 开源',
    ],
  },
  {
    id: 'LGPL-3.0',
    label: 'LGPL-3.0',
    spdx: 'LGPL-3.0',
    color: '#559bcc',
    copyleft: 'weak-lgpl',
    obligations: [
      '保留版权声明与 LGPL 许可证全文',
      '静态链接闭源代码时须提供安装信息/可重新链接材料，允许用户替换库版本',
      '对库本体的修改须以 LGPL-3.0 开源，反规避条款不得限制用户替换库',
    ],
  },
  {
    id: 'MPL-2.0',
    label: 'MPL-2.0',
    spdx: 'MPL-2.0',
    color: '#79a86b',
    copyleft: 'weak-mpl',
    obligations: [
      '文件级著佐权：对 MPL 源文件本身的修改须以 MPL-2.0 继续开源',
      '须保持 MPL 文件的许可证标识可识别',
      '与私有代码同产物分发时专利授权随 MPL 文件一并授予',
    ],
  },
  {
    id: 'GPL-2.0',
    label: 'GPL-2.0',
    spdx: 'GPL-2.0',
    color: '#ec8c75',
    copyleft: 'gpl2',
    obligations: [
      '衍生作品整体须以 GPL-2.0 开源发布',
      '须向二进制接收者提供完整对应源代码（或书面报价）',
      '保留版权声明、许可证全文与免责声明',
      '不得叠加与 GPL-2.0 冲突的附加限制（如 Apache-2.0 专利条款）',
    ],
  },
  {
    id: 'GPL-3.0',
    label: 'GPL-3.0',
    spdx: 'GPL-3.0',
    color: '#e07a5f',
    copyleft: 'gpl3',
    obligations: [
      '衍生作品整体须以 GPL-3.0 开源发布',
      '须向接收者提供完整对应源代码（含安装信息）',
      '保留版权声明、许可证全文与免责声明',
      '专利授权随分发授予，禁止歧视性附加条款与反规避限制',
    ],
  },
  {
    id: 'AGPL-3.0',
    label: 'AGPL-3.0',
    spdx: 'AGPL-3.0',
    color: '#d96459',
    copyleft: 'agpl',
    obligations: [
      'GPL-3.0 的全部义务同样适用',
      '即便是通过网络向用户提供服务（SaaS），也必须向所有远程用户提供完整对应源代码',
      '网络交互即触发源码开放义务，与闭源代码同进程组合风险最高',
    ],
  },
  {
    id: 'Proprietary',
    label: 'Proprietary / 闭源商业',
    spdx: null,
    color: '#8b7fa8',
    copyleft: 'none',
    proprietary: true,
    obligations: [
      '仅可在商业授权（EULA）约定的范围、数量与用途内使用和分发',
      '通常禁止逆向工程、再授权与独立再分发（以授权合同为准）',
      '与强著佐权代码合并会造成合同义务与开源义务正面冲突',
    ],
  },
];

export const licenseById = (id: string): LicenseProfile =>
  LICENSES.find((l) => l.id === id) ?? {
    id,
    label: id,
    spdx: id,
    color: '#888',
    copyleft: 'none',
    obligations: ['许可证档案缺失，发布前须人工核对完整许可证文本'],
  };
