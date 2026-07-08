import { Download, Edit3, Clock, Film } from 'lucide-react';
import { cn } from '../lib/utils';

export default function History() {
  const mockHistory = [
    { id: 1, name: 'Cyber_Neon_Warm_V1', style: '赛博朋克', date: '2023-10-24 14:30', inputType: 'Rec.709', precision: '33x33', status: 'success' },
    { id: 2, name: 'Vintage_Film_Portra_400', style: '复古胶片', date: '2023-10-23 09:15', inputType: 'S-Log3', precision: '65x65', status: 'success' },
    { id: 3, name: 'Cinematic_Teal_Orange', style: '青橙电影感', date: '2023-10-21 18:45', inputType: 'D-Log M', precision: '33x33', status: 'success' },
    { id: 4, name: 'Clean_Japanese_Light', style: '日系清透', date: '2023-10-20 11:20', inputType: 'Rec.709', precision: '17x17', status: 'success' },
    { id: 5, name: 'Moody_HK_Night', style: '港风霓虹', date: '2023-10-18 22:10', inputType: 'V-Log', precision: '33x33', status: 'success' },
  ];

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 h-full overflow-y-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-on-surface">导出记录</h1>
          <p className="text-on-surface-variant mt-1">查看与管理您过去生成的专属 LUT 文件。</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="p-4 text-xs font-mono text-outline uppercase tracking-wider">LUT 名称</th>
                <th className="p-4 text-xs font-mono text-outline uppercase tracking-wider">风格类型</th>
                <th className="p-4 text-xs font-mono text-outline uppercase tracking-wider">生成时间</th>
                <th className="p-4 text-xs font-mono text-outline uppercase tracking-wider">输入类型</th>
                <th className="p-4 text-xs font-mono text-outline uppercase tracking-wider">精度</th>
                <th className="p-4 text-xs font-mono text-outline uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {mockHistory.map((item) => (
                <tr key={item.id} className="hover:bg-surface-variant/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Film className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span className="font-mono text-sm text-on-surface">{item.name}.cube</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/50 text-xs text-on-surface-variant">
                      {item.style}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-on-surface-variant">{item.date}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-secondary/80">{item.inputType}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-outline">{item.precision}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded hover:bg-surface-bright text-on-surface-variant hover:text-primary transition-colors" title="再次编辑">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-colors" title="下载 LUT">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
