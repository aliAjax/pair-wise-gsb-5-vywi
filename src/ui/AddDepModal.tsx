import { useState } from 'react';
import { X } from 'lucide-react';
import { LICENSES, LINK_META, type LinkKind } from '../data/catalog';

interface Props {
  onClose: () => void;
  onAdd: (input: { name: string; license: string; linkKind: LinkKind }) => void;
}

export default function AddDepModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [license, setLicense] = useState('MIT');
  const [linkKind, setLinkKind] = useState<LinkKind>('static');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), license, linkKind });
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>添加依赖</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <label>
          依赖名称
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="例如 date-fns"
          />
        </label>
        <label>
          许可证
          <select value={license} onChange={(e) => setLicense(e.target.value)}>
            {LICENSES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </label>
        <label>
          链接方式
          <select value={linkKind} onChange={(e) => setLinkKind(e.target.value as LinkKind)}>
            {(Object.keys(LINK_META) as LinkKind[]).map((k) => (
              <option key={k} value={k}>{LINK_META[k].label} — {LINK_META[k].hint}</option>
            ))}
          </select>
        </label>
        <button className="primary full" onClick={submit}>加入核验台</button>
      </div>
    </div>
  );
}
