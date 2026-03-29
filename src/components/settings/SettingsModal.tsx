import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Globe, Info, Folder } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../../store/settingsStore';
import type { AppSettings } from '../../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [draft, setDraft] = useState<AppSettings>(settings);

  const handleSave = () => {
    updateSettings(draft);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="设置">
      <div className="flex flex-col gap-6 p-6">
        {/* Worker section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-violet-400" />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Worker 连接</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/45">WebSocket 地址</label>
            <input
              type="text"
              value={draft.websocketUrl}
              onChange={(e) => setDraft((d) => ({ ...d, websocketUrl: e.target.value }))}
              placeholder="ws://localhost:8081/ws"
              className="h-10 px-4 text-sm rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/80 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all placeholder-white/20 font-mono"
            />
            <div className="flex items-start gap-1.5 mt-0.5">
              <Info size={11} className="text-white/20 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/20 leading-relaxed">
                本地 Express Worker 的 WebSocket 地址，默认端口 8081。确保豆包扩展已在浏览器中运行。
              </p>
            </div>
          </div>
        </div>
 
        {/* Download Path section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Folder size={13} className="text-violet-400" />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">下载路径</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/45">保存目录</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={draft.saveDir}
                onChange={(e) => setDraft((d) => ({ ...d, saveDir: e.target.value }))}
                placeholder="默认使用系统下载目录"
                className="flex-1 h-10 px-4 text-sm rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/80 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all placeholder-white/20"
              />
              <Button 
                variant="secondary" 
                size="md" 
                onClick={async () => {
                  try {
                    const selected = await openDialog({
                      directory: true,
                      multiple: false,
                      title: '选择生成图片保存目录'
                    });
                    if (selected && typeof selected === 'string') {
                      setDraft(d => ({ ...d, saveDir: selected }));
                    }
                  } catch (err) {
                    console.error('Failed to open directory picker:', err);
                  }
                }}
                className="shrink-0"
              >
                浏览...
              </Button>
            </div>
            <p className="text-[11px] text-white/20 mt-0.5">
              生成的图片将自动保存到此目录。留空则默认保存到系统的“下载”文件夹。
            </p>
          </div>
        </div>

        {/* About section */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col gap-1">
          <p className="text-xs font-semibold text-white/40">豆包生图助手</p>
          <p className="text-[11px] text-white/20 leading-relaxed">
            通过本地 Chrome 扩展与豆包 Web 端通信，自动提交提示词并获取生成图片。
          </p>
        </div>

        <div className="flex justify-end pt-1.5 border-t border-white/[0.06]" style={{ gap: '12px' }}>
          <Button variant="secondary" size="md" onClick={onClose}>取消</Button>
          <Button variant="primary" size="md" onClick={handleSave}>保存设置</Button>
        </div>
      </div>
    </Modal>
  );
}
