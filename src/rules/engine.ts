// 判断层：链接方式 × 许可证相容性规则（纯函数，可独立测试/复用）
import {
  licenseById,
  type Alternative,
  type Copyleft,
  type Dep,
  type Level,
  type LinkKind,
} from '../data/catalog';

export interface PairVerdict {
  key: string;
  aId: number;
  bId: number;
  level: Level;
  title: string;
  reason: string;
  /** 本次组合实际触发的许可证义务 */
  triggered: string[];
  /** 冲突双方已登记的可选替代版本 */
  alternatives: Alternative[];
  /** 把某一方改成何种链接方式可化解（引擎模拟重算得出） */
  remedies: LinkKind[];
}

export interface Ruling {
  id: string;
  at: number;
  deps: Dep[];
  pairCount: number;
  counts: Record<Level, number>;
  overall: Level;
  verdicts: PairVerdict[];
}

const RANK: Record<Level, number> = { pass: 0, notice: 1, warn: 2, block: 3 };
const STRONG: Copyleft[] = ['gpl2', 'gpl3', 'agpl'];

/** 两包之间的有效组合关系：任一侧独立进程即聚合；否则取更紧密的一侧 */
const TIGHTNESS: Record<LinkKind, number> = { process: 0, dynamic: 1, plugin: 2, static: 3 };
const TIGHT_ORDER: LinkKind[] = ['process', 'dynamic', 'plugin', 'static'];
const effectiveLink = (a: Dep, b: Dep): LinkKind =>
  a.linkKind === 'process' || b.linkKind === 'process'
    ? 'process'
    : TIGHT_ORDER[Math.max(TIGHTNESS[a.linkKind], TIGHTNESS[b.linkKind])];

const NOTICE_OBLIGATIONS = [
  '随产物保留各依赖的版权声明、许可证全文（及 NOTICE 文件）',
];

const pairKey = (a: Dep, b: Dep) =>
  a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;

const dedupe = (xs: string[]) => [...new Set(xs)];

/** 模拟：把其中一方的链接方式改成 candidate，重新判定，用于给出整改建议 */
function remediesFor(a: Dep, b: Dep, current: Level): LinkKind[] {
  const out: LinkKind[] = [];
  (['dynamic', 'process', 'plugin', 'static'] as LinkKind[]).forEach((k) => {
    if (k === a.linkKind && k === b.linkKind) return;
    const tryA = k !== a.linkKind ? evaluateCore({ ...a, linkKind: k }, b) : null;
    const tryB = k !== b.linkKind ? evaluateCore(a, { ...b, linkKind: k }) : null;
    const best = [tryA, tryB]
      .filter(Boolean)
      .map((v) => v!.level)
      .sort((x, y) => RANK[x] - RANK[y])[0];
    if (best !== undefined && RANK[best] < RANK[current] && RANK[best] <= RANK.notice) {
      out.push(k);
    }
  });
  return out;
}

/** 两版强著佐权之间的版本关系：null=无冲突，否则给出冲突说明（仅在双方均为强著佐权时调用） */
function copyleftClash(x: Copyleft, y: Copyleft): string | null {
  const set = new Set([x, y]);
  if (set.has('gpl2') && set.has('gpl3')) {
    return 'GPL-2.0（无 or-later 条款）与 GPL-3.0 单向不兼容：二者代码不能合并进同一作品，需上游补充 or-later 授权或更换版本。';
  }
  if (set.has('gpl2') && set.has('agpl')) {
    return 'GPL-2.0 与 AGPL-3.0 不兼容：AGPL-3.0 第 13 条仅允许与 GPL-3.0 代码组合。';
  }
  return null;
}

/** 核心判定：只给出等级/理由/义务，不计算整改建议（供模拟调用，避免递归） */
function evaluateCore(a: Dep, b: Dep): PairVerdict {
  const la = licenseById(a.license);
  const lb = licenseById(b.license);
  const ca = la.copyleft;
  const cb = lb.copyleft;
  const key = pairKey(a, b);
  const alts = dedupe([...(a.alternatives ?? []), ...(b.alternatives ?? [])].map((x) => JSON.stringify(x))).map((x) => JSON.parse(x)) as Alternative[];

  const base = { key, aId: a.id, bId: b.id, alternatives: alts };
  const strongA = STRONG.includes(ca);
  const strongB = STRONG.includes(cb);
  const propA = la.proprietary === true;
  const propB = lb.proprietary === true;
  const bothStrong = strongA && strongB;
  const oneStrongOneProp = (strongA && propB) || (strongB && propA);
  const weakSide =
    ca === 'weak-lgpl' || cb === 'weak-lgpl'
      ? ca === 'weak-lgpl' ? la : lb
      : null;

  // 强著佐权之间的版本冲突，与链接方式无关
  if (bothStrong) {
    const clash = copyleftClash(ca, cb);
    const agplPair = ca === 'agpl' && cb === 'gpl3' || cb === 'agpl' && ca === 'gpl3';
    const separated = effectiveLink(a, b) === 'process';
    if (clash && !separated) {
      return finish({
        ...base,
        level: 'block',
        title: '著佐权版本互不兼容',
        reason: clash,
        triggered: [...la.obligations, ...lb.obligations],
      });
    }
    if (separated) {
      return finish({
        ...base,
        level: 'notice',
        title: '独立进程构成聚合，两份著佐权代码各自按原许可证分发',
        reason: clash
          ? `${clash} 但二者以独立进程、保持距离的接口协作，不构成合并作品，版本不兼容在聚合形态下不被触发；一旦回退为同进程链接即构成冲突。`
          : '进程隔离下各自履行自身许可证义务即可；AGPL 一方仍独立承担网络源码开放义务。',
        triggered: NOTICE_OBLIGATIONS,
      });
    }
    if (agplPair) {
      return finish({
        ...base,
        level: 'notice',
        title: '可组合，组合产物按 AGPL-3.0 发布',
        reason: 'AGPL-3.0 第 13 条明确允许与 GPL-3.0 代码组合，组合后整体适用 AGPL-3.0（含网络源码义务）。',
        triggered: licenseById(ca === 'agpl' ? a.license : b.license).obligations,
      });
    }
    // 同族 GPL2/GPL2、GPL3/GPL3
    const profile = ca === 'gpl2' || cb === 'gpl2' ? licenseById(ca === 'gpl2' ? a.license : b.license) : la;
    return finish({
      ...base,
      level: 'notice',
      title: `同族著佐权，组合产物整体按 ${profile.id} 开源`,
      reason: `两份代码许可证同族，合并作品须继续以 ${profile.id} 发布并向接收者提供完整对应源代码。`,
      triggered: profile.obligations,
    });
  }

  // 弱著佐权 / MPL 与 GPL 版本的兼容细节（静态/动态/插件同进程时适用）
  const mplGpl =
    (ca === 'weak-mpl' && STRONG.includes(cb)) ||
    (cb === 'weak-mpl' && STRONG.includes(ca));
  if (mplGpl && effectiveLink(a, b) !== 'process') {
    const gplIs2 = ca === 'gpl2' || cb === 'gpl2';
    if (gplIs2) {
      return finish({
        ...base,
        level: 'block',
        title: 'MPL-2.0 与 GPL-2.0 不能同产物合并',
        reason: 'MPL-2.0 的文件级著佐权与 GPL-2.0 条款冲突；MPL-2.0 第 3.3 条仅提供向 GPL-3.0（含 LGPL/AGPL-3.0）的二级许可兼容。',
        triggered: [...la.obligations, ...lb.obligations],
      });
    }
    const gplProfile = strongA ? la : lb;
    return finish({
      ...base,
      level: 'notice',
      title: 'MPL-2.0 可升级并入 GPL-3.0 作品',
      reason: '原 MPL 文件按 MPL-2.0 第 3.3 条二级许可参与 GPL-3.0 组合，MPL 文件修改仍可按 MPL 提供源码，组合整体按 GPL-3.0。',
      triggered: gplProfile.obligations,
    });
  }

  const apacheGpl2 =
    ((a.license === 'Apache-2.0' && ca === 'none' && cb === 'gpl2') ||
     (b.license === 'Apache-2.0' && cb === 'none' && ca === 'gpl2'));
  if (apacheGpl2 && effectiveLink(a, b) !== 'process') {
    return finish({
      ...base,
      level: 'block',
      title: 'Apache-2.0 与 GPL-2.0 专利条款冲突',
      reason: 'Apache-2.0 的专利反诉与处置条款被 FSF 认定为 GPL-2.0 不可承受的附加限制；与 GPL-3.0 则相容，或改为进程隔离。',
      triggered: [...la.obligations, ...lb.obligations],
    });
  }

  // LGPL 与 GPL 跨版本
  if (weakSide && (strongA || strongB)) {
    const gplCopyleft = strongA ? ca : cb;
    const lgplIs21 = weakSide.id === 'LGPL-2.1';
    const separated = effectiveLink(a, b) === 'process';
    if (separated) {
      return finish({
        ...base,
        level: 'notice',
        title: '进程聚合：LGPL 库与 GPL 组件各自履行义务',
        reason: `独立进程下 ${weakSide.id} 组件不并入 GPL 作品，各自保留源码/声明义务；回退为同进程链接后将按下述组合规则处理。`,
        triggered: NOTICE_OBLIGATIONS,
      });
    }
    if (lgplIs21 && gplCopyleft === 'gpl3') {
      return finish({
        ...base,
        level: 'warn',
        title: 'LGPL-2.1 并入 GPL-3.0 作品需 or-later 授权',
        reason: 'LGPL-2.1 仅在许可证标注含 “or any later version” 时可升级到 GPL-3.0；须核对上游库的实际许可证标注，否则按版本冲突处理。',
        triggered: weakSide.obligations,
      });
    }
    const gplProfile = strongA ? la : lb;
    return finish({
      ...base,
      level: 'notice',
      title: `LGPL 库可参与 ${gplProfile.id} 组合`,
      reason: `库本体修改仍按 ${weakSide.id} 开放，组合作品整体适用 ${gplProfile.id}；闭源主程序不能以静态方式并入该 GPL 代码。`,
      triggered: gplProfile.obligations,
    });
  }

  // —— 核心场景：强著佐权 × 闭源 ——
  // 以强著佐权组件自身的集成方式为准：它是否被并入闭源产物决定了义务是否蔓延
  if (oneStrongOneProp) {
    const strongDep = strongA ? a : b;
    const strongProfile = strongA ? la : lb;
    const propDep = strongA ? b : a;
    const link =
      a.linkKind === 'process' || b.linkKind === 'process' ? 'process' : strongDep.linkKind;

    if (link === 'static') {
      return finish({
        ...base,
        level: 'block',
        title: `${strongProfile.id} 静态链接与闭源许可不能共存`,
        reason: `${strongDep.name}（${strongProfile.id}）以静态链接并入同一产物后，整体构成衍生作品，须按 ${strongProfile.id} 开放完整源码；而 ${propDep.name} 的闭源商业授权（EULA）禁止开源与再授权，两项义务无法同时履行。`,
        triggered: [
          ...strongProfile.obligations,
          ...licenseById(propDep.license).obligations,
        ],
      });
    }
    if (link === 'plugin') {
      return finish({
        ...base,
        level: 'block',
        title: `插件组合未获双方许可：${strongProfile.id} 插件 × 闭源宿主/插件`,
        reason: `插件在宿主进程内按接口加载，${strongProfile.id} 口径下与宿主构成同一程序的衍生作品；需要 ${strongProfile.id} 一方明确给出插件/链接例外，且闭源 EULA 允许履行开源义务——目前双方均未授权这种组合。`,
        triggered: [
          ...strongProfile.obligations,
          ...licenseById(propDep.license).obligations,
        ],
      });
    }
    if (link === 'dynamic') {
      return finish({
        ...base,
        level: 'warn',
        title: `动态链接仍有被认定为衍生作品的风险`,
        reason: `FSF 口径认为同地址空间的动态链接同样触发 ${strongProfile.id}，仅 LGPL 明确允许此方式与闭源共存。若改为独立进程（仅经 IPC/管道通信）通常构成聚合，可化解义务冲突。`,
        triggered: strongProfile.obligations,
      });
    }
    // process
    if (strongProfile.copyleft === 'agpl') {
      return finish({
        ...base,
        level: 'warn',
        title: '进程隔离可成立，但 AGPL-3.0 网络义务独立存在',
        reason: `独立进程经 IPC 协作通常构成“聚合”而非衍生作品；但 ${strongDep.name} 若通过网络向用户提供服务，AGPL-3.0 第 13 条仍要求向所有远程用户开放完整对应源代码，闭源采购合同需确认容忍该义务。`,
        triggered: strongProfile.obligations,
      });
    }
    return finish({
      ...base,
      level: 'notice',
      title: '独立进程构成聚合，义务相互隔离',
      reason: `二者以独立进程、保持距离的接口（IPC/管道/命令行）通信，通常不构成衍生作品：${strongDep.name} 自身仍按 ${strongProfile.id} 分发，闭源主程序无需开源；注意不得回退为同进程链接。`,
      triggered: strongProfile.obligations.slice(0, 3),
    });
  }

  // LGPL × 闭源：随链接方式变化（以 LGPL 组件自身的集成方式为准，任一侧进程隔离即聚合）
  if ((ca === 'weak-lgpl' && propB) || (cb === 'weak-lgpl' && propA)) {
    const lgplDep = ca === 'weak-lgpl' ? a : b;
    const lgpl = ca === 'weak-lgpl' ? la : lb;
    const lgplLink =
      a.linkKind === 'process' || b.linkKind === 'process' ? 'process' : lgplDep.linkKind;
    if (lgplLink === 'static') {
      return finish({
        ...base,
        level: 'warn',
        title: `${lgpl.id} 静态链接闭源代码：须提供可重新链接材料`,
        reason: '闭源主程序可以静态链接 LGPL 库，但必须随分发提供目标文件/安装信息，允许终端用户用修改后的库版本重新链接，并保留库修改源码的开放渠道。',
        triggered: lgpl.obligations,
      });
    }
    if (lgplLink === 'dynamic') {
      return finish({
        ...base,
        level: 'pass',
        title: `动态链接符合 ${lgpl.id} 的预期使用方式`,
        reason: '以共享库方式动态加载、允许用户替换库版本，是 LGPL 为闭源主程序预留的合规路径，履行声明义务即可。',
        triggered: lgpl.obligations.slice(0, 2),
      });
    }
    if (lgplLink === 'plugin') {
      return finish({
        ...base,
        level: 'notice',
        title: `${lgpl.id} 插件可被闭源宿主加载`,
        reason: 'LGPL 允许闭源程序通过明确接口加载 LGPL 库；须允许用户替换插件/库版本，并开放对库本体的修改。',
        triggered: lgpl.obligations.slice(0, 2),
      });
    }
    return finish({
      ...base,
      level: 'pass',
      title: '进程调用，许可证相互独立',
      reason: '独立进程协作不触发 LGPL 的重新链接义务，保留许可证声明即可。',
      triggered: NOTICE_OBLIGATIONS,
    });
  }

  // MPL × 闭源：文件级著佐权，任何链接方式均可共存
  if ((ca === 'weak-mpl' && propB) || (cb === 'weak-mpl' && propA)) {
    const mpl = ca === 'weak-mpl' ? la : lb;
    return finish({
      ...base,
      level: 'notice',
      title: 'MPL-2.0 文件级著佐权，可与闭源同产物分发',
      reason: 'MPL-2.0 仅要求被修改的 MPL 源文件本身继续开源，不蔓延到同产物内的私有文件；私有文件与 MPL 文件须保持清晰边界。',
      triggered: mpl.obligations,
    });
  }

  // 强著佐权 × 宽松许可：可组合，整体被“拉升”到强许可证
  if (strongA || strongB) {
    const strongProfile = strongA ? la : lb;
    if (effectiveLink(a, b) === 'process') {
      return finish({
        ...base,
        level: 'notice',
        title: '进程聚合：宽松许可一方不受著佐权感染',
        reason: `独立进程下 ${strongProfile.id} 义务仅限其自身组件；若改为同进程链接，组合产物将整体适用 ${strongProfile.id}。`,
        triggered: NOTICE_OBLIGATIONS,
      });
    }
    return finish({
      ...base,
      level: 'notice',
      title: `相容，但组合产物整体须按 ${strongProfile.id} 发布`,
      reason: `宽松许可代码可并入 ${strongProfile.id} 作品（单向兼容），合并后整体须履行 ${strongProfile.id} 的源码开放义务；宽松许可的版权声明仍须保留。`,
      triggered: strongProfile.obligations,
    });
  }

  // 双方均为宽松许可或闭源商业许可：无著佐权冲突
  if (propA || propB) {
    return finish({
      ...base,
      level: 'pass',
      title: propA && propB ? '两份闭源商业授权：核对各自 EULA 范围' : '闭源组件与宽松许可可共存',
      reason: propA && propB
        ? '两份商业授权各自约定使用范围与再分发条件，请确认 EULA 是否允许随同一产物分发。'
        : '宽松许可证不要求开放主程序源码，履行版权声明与 NOTICE 保留义务即可与闭源代码同产物分发。',
      triggered: NOTICE_OBLIGATIONS,
    });
  }

  return finish({
    ...base,
    level: 'pass',
    title: '宽松许可之间相容',
    reason: 'MIT / ISC / BSD / Apache-2.0 等宽松许可证可任意静态、动态或插件组合，履行声明保留义务即可；Apache-2.0 与 BSD 另需保留 NOTICE 与变更标注。',
    triggered: NOTICE_OBLIGATIONS,
  });
}

/** 汇总：去重义务文本（整改建议由 evaluatePair 包装层计算） */
function finish(v: Omit<PairVerdict, 'remedies'>): PairVerdict {
  return { ...v, triggered: dedupe(v.triggered), remedies: [] };
}

/** 完整判定：核心裁决 + 针对 warn/block 的链接方式整改建议 */
export function evaluatePair(a: Dep, b: Dep): PairVerdict {
  const v = evaluateCore(a, b);
  if (RANK[v.level] < RANK.warn) return v;
  return { ...v, remedies: remediesFor(a, b, v.level) };
}

export function evaluateAll(deps: Dep[]): Omit<Ruling, 'id' | 'at' | 'deps'> {
  const verdicts: PairVerdict[] = [];
  for (let i = 0; i < deps.length; i++) {
    for (let j = i + 1; j < deps.length; j++) {
      verdicts.push(evaluatePair(deps[i], deps[j]));
    }
  }
  const counts: Record<Level, number> = { pass: 0, notice: 0, warn: 0, block: 0 };
  verdicts.forEach((v) => {
    counts[v.level]++;
  });
  const overall = verdicts.reduce<Level>(
    (worst, v) => (RANK[v.level] > RANK[worst] ? v.level : worst),
    'pass',
  );
  verdicts.sort((x, y) => RANK[y.level] - RANK[x.level] || x.key.localeCompare(y.key));
  return { verdicts, counts, overall, pairCount: verdicts.length };
}

export function makeRuling(deps: Dep[]): Ruling {
  return {
    id: `R-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`,
    at: Date.now(),
    deps: JSON.parse(JSON.stringify(deps)),
    ...evaluateAll(deps),
  };
}

export const levelRank = RANK;

/** 模拟把某一方改成 kind 链接方式后的裁决，供页面“一键整改”选择目标方 */
export function simulateRemedy(
  a: Dep,
  b: Dep,
  kind: LinkKind,
): { depId: number; level: Level } | null {
  const options: { depId: number; level: Level }[] = [];
  if (kind !== a.linkKind) options.push({ depId: a.id, level: evaluateCore({ ...a, linkKind: kind }, b).level });
  if (kind !== b.linkKind) options.push({ depId: b.id, level: evaluateCore(a, { ...b, linkKind: kind }).level });
  if (!options.length) return null;
  options.sort((x, y) => RANK[x.level] - RANK[y.level]);
  return RANK[options[0].level] <= RANK.notice ? options[0] : null;
}
