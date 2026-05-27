import { useEffect, useRef, useState } from 'react';

const getNowTimeLabel = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

function DailyNoteModal({
  open,
  title,
  initialValue,
  loading,
  saving,
  onClose,
  onSave
}) {
  const [value, setValue] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const debounceTimerRef = useRef(null);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    if (open) {
      isHydratingRef.current = true;
      setValue(initialValue || '');
      setAutoSaveStatus('idle');
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }
    if (!open || loading) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        await onSave(value, { closeAfterSave: false, silent: true });
        setLastSavedAt(new Date());
        setAutoSaveStatus('saved');
      } catch (_err) {
        setAutoSaveStatus('error');
      }
    }, 1200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, open, loading, onSave]);

  const statusText =
    autoSaveStatus === 'saving'
      ? '自动保存中...'
      : autoSaveStatus === 'saved'
      ? `已自动保存${lastSavedAt ? `（${lastSavedAt.toLocaleTimeString()}）` : ''}`
      : autoSaveStatus === 'error'
      ? '自动保存失败'
      : '自动保存已开启';

  const insertText = (text) => {
    setValue((prev) => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${text}`);
  };

  const insertNowTime = () => {
    insertText(`#### ${getNowTimeLabel()} `);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {loading ? (
          <p>加载中...</p>
        ) : (
          <>
            <div className="note-toolbar">
              <button type="button" onClick={insertNowTime}>插入当前时间</button>
              <button type="button" onClick={() => insertText('### ')}>插入三级标题</button>
            </div>
            <textarea
              className="daily-note-textarea"
              rows={14}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="请输入内容..."
            />
            <p className="note-status">{statusText}</p>
          </>
        )}
        <div className="modal-actions">
          <button className="primary" disabled={loading || saving} onClick={() => onSave(value, { closeAfterSave: true, silent: false })}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button className="close-btn" disabled={saving} onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

export default DailyNoteModal;
