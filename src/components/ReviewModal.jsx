import { useState, useEffect } from 'react';
import { getReview } from '../api';

function ReviewModal({ date, onClose, onExport }) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReview() {
      try {
        const data = await getReview(date);
        setMarkdown(data.markdown_content);
      } catch (err) {
        setMarkdown('暂无复盘数据，请先点击"生成复盘"。');
      } finally {
        setLoading(false);
      }
    }
    fetchReview();
  }, [date]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>每日复盘 - {date}</h2>
        {loading ? (
          <p>加载中...</p>
        ) : (
          <pre>{markdown}</pre>
        )}
        <div className="modal-actions">
          <button className="download-btn" onClick={onExport}>下载 Markdown</button>
          <button className="close-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;
