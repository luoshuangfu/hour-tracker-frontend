const COLORS = [
  { value: '#ef4444', label: '红' },
  { value: '#3b82f6', label: '蓝' },
  { value: '#22c55e', label: '绿' },
  { value: '#eab308', label: '黄' },
  { value: '#ffffff', label: '白' },
  { value: '#898c90', label: '灰' },
  { value: '#75a56c', label: '睡觉' }
];

const SCORE_OPTIONS = [1, 2, 3, 4, 5];

function HourBlock({ block, expanded, onToggle, onChange }) {
  const formatHour = (h) => `${String(h).padStart(2, '0')}:00 - ${String((h + 1) % 24).padStart(2, '0')}:00`;
  const firstHalfColor = block.first_half_color || '#000000';
  const secondHalfColor = block.second_half_color || '#000000';

  return (
    <div className={`hour-block-shell ${expanded ? 'expanded' : ''}`}>
      <button className="hour-rail" type="button" onClick={() => onToggle(block.hour)}>
        <div className="hour-time-badge">{formatHour(block.hour)}</div>
        <div className="hour-half hour-half-top" style={{ background: firstHalfColor }} />
        <div className="hour-half hour-half-bottom" style={{ background: secondHalfColor }} />
      </button>

      {expanded && (
        <div className="hour-detail">
          <div className="detail-item">
            <span className="section-title">预期目标</span>
            <input
              type="text"
              value={block.expected_goal || ''}
              onChange={(e) => onChange(block.hour, 'expected_goal', e.target.value)}
              placeholder="输入该小时的预期目标,晚于时间结束不可填写"
              disabled={!block.canEditExpectedGoal}
            />
          </div>
          <div className="detail-item">
            <span className="section-title">实际完成</span>
            <input
              type="text"
              value={block.actual_done || ''}
              onChange={(e) => onChange(block.hour, 'actual_done', e.target.value)}
              placeholder="输入实际完成情况，早于时间开始不可填写"
              disabled={!block.canEditActualDone}
            />
          </div>
          <div className="detail-item">
            <span className="section-title">分数 1~5</span>
            <select value={block.score || ''} onChange={(e) => onChange(block.hour, 'score', e.target.value)}>
              <option value="">请选择</option>
              {SCORE_OPTIONS.map((score) => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>
          <div className="detail-item">
            <span className="section-title">前半段颜色</span>
            <div className="color-row">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`color-swatch ${firstHalfColor === color.value ? 'active' : ''}`}
                  style={{ background: color.value, color: color.value === '#ffffff' ? '#111827' : '#fff' }}
                  onClick={(e) => { e.stopPropagation(); onChange(block.hour, 'first_half_color', color.value); }}
                  type="button"
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-item">
            <span className="section-title">后半段颜色</span>
            <div className="color-row">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`color-swatch ${secondHalfColor === color.value ? 'active' : ''}`}
                  style={{ background: color.value, color: color.value === '#ffffff' ? '#111827' : '#fff' }}
                  onClick={(e) => { e.stopPropagation(); onChange(block.hour, 'second_half_color', color.value); }}
                  type="button"
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          


        </div>
      )}
    </div>
  );
}

export default HourBlock;
