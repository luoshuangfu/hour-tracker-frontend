import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  getBlocks,
  updateBlock,
  generateReview,
  exportReview,
  register,
  login,
  me,
  updateProfile,
  getToken,
  setToken,
  clearToken,
  getMarkdownDownloadPath,
  setMarkdownDownloadPath,
  sendPasswordResetCode,
  confirmPasswordReset,
  getDailyNotes,
  updateDailyNotes,
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from './api';
import HourBlock from './components/HourBlock';
import ReviewModal from './components/ReviewModal';
import DailyNoteModal from './components/DailyNoteModal';

function TaskItem({ task, onRename, onComplete, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.content);

  useEffect(() => {
    setValue(task.content);
  }, [task.content]);

  return (
    <div className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
      <button
        className="task-check"
        disabled={task.status === 'completed'}
        onClick={() => onComplete(task.id)}
      >
        {task.status === 'completed' ? '✓' : '○'}
      </button>

      {editing ? (
        <input
          className="task-edit-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={async () => {
            await onRename(task.id, value);
            setEditing(false);
          }}
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              await onRename(task.id, value);
              setEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <span className="task-text" onDoubleClick={() => setEditing(true)}>{task.content}</span>
      )}

      <button className="task-delete" onClick={() => onDelete(task.id)}>删除</button>
    </div>
  );
}

function App() {
  const [currentDate, setCurrentDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [expandedHour, setExpandedHour] = useState(null);
  const [noteModalType, setNoteModalType] = useState(null);
  const [dailyNotes, setDailyNotes] = useState({ today_review: '', today_diary: '' });
  const [dailyNotesLoading, setDailyNotesLoading] = useState(false);
  const [dailyNotesSaving, setDailyNotesSaving] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', code: '', newPassword: '' });
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [activePage, setActivePage] = useState('tracker');
  const [settingsTab, setSettingsTab] = useState('username');
  const [helpTab, setHelpTab] = useState('overview');
  const [profileForm, setProfileForm] = useState({ username: '' });
  const [exportForm, setExportForm] = useState({ markdownPath: getMarkdownDownloadPath() });

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBlocks(currentDate);
      const normalized = Array.isArray(data)
        ? data.map((block) => ({
            ...block,
            first_half_color: block.first_half_color || '#000000',
            second_half_color: block.second_half_color || '#000000',
            expected_goal: block.expected_goal || '',
            actual_done: block.actual_done || '',
            score: block.score ?? '',
            note: block.note || '',
            canEditExpectedGoal: Boolean(block.canEditExpectedGoal),
            canEditActualDone: Boolean(block.canEditActualDone)
          }))
        : [];
      setBlocks(normalized);
      if (data?.length && expandedHour !== null && !data.some((block) => block.hour === expandedHour)) {
        setExpandedHour(data[0].hour);
      }
    } catch (err) {
      console.error('Failed to fetch blocks:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, expandedHour]);

  useEffect(() => {
    async function bootstrapAuth() {
      const token = getToken();
      if (!token) {
        setAuthChecked(true);
        return;
      }
      try {
        const data = await me();
        setUser(data.user);
        setProfileForm({ username: data.user?.username || '' });
      } catch (_err) {
        clearToken();
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }
    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBlocks();
    }
  }, [user, fetchBlocks]);

  useEffect(() => {
    if (user?.username) {
      setProfileForm((prev) => ({ ...prev, username: user.username }));
    }
  }, [user]);

  const loadDailyNotes = useCallback(async () => {
    if (!user) return;
    setDailyNotesLoading(true);
    try {
      const data = await getDailyNotes(currentDate);
      setDailyNotes({
        today_review: data?.today_review || '',
        today_diary: data?.today_diary || ''
      });
    } catch (err) {
      showToast(err?.response?.data?.message || '加载今日心得/日记失败');
    } finally {
      setDailyNotesLoading(false);
    }
  }, [currentDate, user]);

  useEffect(() => {
    if (user) {
      loadDailyNotes();
    }
  }, [user, currentDate, loadDailyNotes]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setTasksLoading(true);
    try {
      const data = await getTasks(currentDate);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err?.response?.data?.message || '加载任务失败');
    } finally {
      setTasksLoading(false);
    }
  }, [user, currentDate]);

  useEffect(() => {
    if (user) {
      loadTasks();
      setTaskInput('');
    }
  }, [user, currentDate, loadTasks]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegisterMode) {
        const data = await register(authForm.username, authForm.email, authForm.password);
        setToken(data.token);
        setUser(data.user);
      } else {
        const data = await login(authForm.email, authForm.password);
        setToken(data.token);
        setUser(data.user);
      }
      setAuthForm({ username: '', email: '', password: '' });
      showToast('登录成功');
    } catch (err) {
      showToast(err?.response?.data?.message || '认证失败');
    }
  };

  const handleSendResetCode = async () => {
    if (!resetForm.email) {
      showToast('请先输入邮箱');
      return;
    }
    try {
      const res = await sendPasswordResetCode(resetForm.email);
      showToast(res.message || '验证码已发送');
    } catch (err) {
      showToast(err?.response?.data?.message || '发送验证码失败');
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    try {
      const res = await confirmPasswordReset(resetForm.email, resetForm.code, resetForm.newPassword);
      showToast(res.message || '密码重置成功');
      setShowResetPassword(false);
      setResetForm({ email: '', code: '', newPassword: '' });
    } catch (err) {
      showToast(err?.response?.data?.message || '重置密码失败');
    }
  };

  const handleLogout = () => {
    clearToken();
    setShowUserSettings(false);
    setActivePage('tracker');
    setUser(null);
    setBlocks([]);
    setExpandedHour(null);
    showToast('已退出登录');
  };

  const handleSettings = () => {
    setShowUserSettings(false);
    setSettingsTab('username');
    setProfileForm({ username: user?.username || '' });
    setExportForm({ markdownPath: getMarkdownDownloadPath() });
    setActivePage('settings');
  };

  const handleHelp = () => {
    setShowUserSettings(false);
    setHelpTab('overview');
    setActivePage('help');
  };

  const handleBlockChange = async (hour, field, value) => {
    const nextBlocks = blocks.map((block) => (block.hour === hour ? { ...block, [field]: value } : block));
    setBlocks(nextBlocks);

    const block = nextBlocks.find((item) => item.hour === hour);
    try {
      await updateBlock(currentDate, hour, {
        first_half_color: block.first_half_color,
        second_half_color: block.second_half_color,
        expected_goal: block.expected_goal,
        actual_done: block.actual_done,
        score: block.score,
        note: block.note
      });
    } catch (err) {
      console.error('Failed to save block:', err);
      showToast('保存失败');
    }
  };

  const handleGenerateReview = async () => {
    try {
      await generateReview(currentDate);
      showToast('复盘已生成');
      setShowReview(true);
    } catch (err) {
      showToast('生成失败: ' + err.message);
    }
  };

  const handleExport = async () => {
    try {
      await exportReview(currentDate);
      showToast('Markdown 已导出');
    } catch (err) {
      showToast('导出失败: ' + err.message);
    }
  };

  const handleTodayReview = async () => {
    setNoteModalType('today_review');
    await loadDailyNotes();
  };

  const handleTodayDiary = async () => {
    setNoteModalType('today_diary');
    await loadDailyNotes();
  };

  const handleSaveDailyNote = useCallback(async (value, options = {}) => {
    const { closeAfterSave = true, silent = false } = options;
    if (!noteModalType) return;
    const payload = {
      ...dailyNotes,
      [noteModalType]: value
    };
    setDailyNotesSaving(true);
    try {
      await updateDailyNotes(currentDate, payload);
      setDailyNotes(payload);
      if (!silent) {
        showToast('保存成功');
      }
      if (closeAfterSave) {
        setNoteModalType(null);
      }
    } catch (err) {
      if (!silent) {
        showToast(err?.response?.data?.message || '保存失败');
      }
      throw err;
    } finally {
      setDailyNotesSaving(false);
    }
  }, [noteModalType, dailyNotes, currentDate]);

  const handleAddTask = async () => {
    const content = taskInput.trim();
    if (!content) return;
    try {
      await createTask(currentDate, content);
      setTaskInput('');
      await loadTasks();
    } catch (err) {
      showToast(err?.response?.data?.message || '新增任务失败');
    }
  };

  const handleTaskRename = async (taskId, content) => {
    const trimmed = content.trim();
    if (!trimmed) {
      showToast('任务名称不能为空');
      return;
    }
    try {
      await updateTask(currentDate, taskId, { content: trimmed });
      await loadTasks();
    } catch (err) {
      showToast(err?.response?.data?.message || '修改任务失败');
    }
  };

  const handleTaskComplete = async (taskId) => {
    try {
      await updateTask(currentDate, taskId, { status: 'completed' });
      await loadTasks();
    } catch (err) {
      showToast(err?.response?.data?.message || '更新任务状态失败');
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await deleteTask(currentDate, taskId);
      await loadTasks();
    } catch (err) {
      showToast(err?.response?.data?.message || '删除任务失败');
    }
  };

  const handleSaveUsername = async (e) => {
    e.preventDefault();
    const nextName = profileForm.username.trim();
    if (!nextName) {
      showToast('用户名不能为空');
      return;
    }
    try {
      const data = await updateProfile(nextName);
      if (data?.token) {
        setToken(data.token);
      }
      if (data?.user) {
        setUser(data.user);
        setProfileForm({ username: data.user.username || '' });
      }
      showToast(data?.message || '用户名已更新');
    } catch (err) {
      showToast(err?.response?.data?.message || '用户名更新失败');
    }
  };

  const handleSaveExportPath = (e) => {
    e.preventDefault();
    const nextPath = exportForm.markdownPath.trim();
    if (!nextPath) {
      showToast('导出路径不能为空');
      return;
    }
    setMarkdownDownloadPath(nextPath);
    setExportForm({ markdownPath: nextPath });
    showToast(`Markdown导出路径已更新为：${nextPath}`);
  };

  const prevDay = () => setCurrentDate(dayjs(currentDate).subtract(1, 'day').format('YYYY-MM-DD'));
  const nextDay = () => setCurrentDate(dayjs(currentDate).add(1, 'day').format('YYYY-MM-DD'));
  const today = () => setCurrentDate(dayjs().format('YYYY-MM-DD'));

  const blueRedCount = blocks.reduce((sum, block) => {
    const colors = [block.first_half_color, block.second_half_color];
    return sum + colors.filter((c) => c === '#3b82f6' || c === '#ef4444').length;
  }, 0);

  const greenYellowCount = blocks.reduce((sum, block) => {
    const colors = [block.first_half_color, block.second_half_color];
    return sum + colors.filter((c) => c === '#22c55e' || c === '#eab308').length;
  }, 0);

  const blackGrayCount = blocks.reduce((sum, block) => {
    const colors = [block.first_half_color, block.second_half_color];
    return sum + colors.filter((c) => c === '#000000' || c === '#898c90').length;
  }, 0);

  const ratio = `${blueRedCount}:${greenYellowCount}:${blackGrayCount}`;

  if (!authChecked) {
    return <div className="loading">认证中...</div>;
  }

  if (!user) {
    return (
      <div className="app timeline-app">
        <div className="header">
          <h1>24 Hour Tracker</h1>
          <p>请先登录以同步你的时间数据</p>
        </div>

        {!showResetPassword ? (
          <form className="auth-card" onSubmit={handleAuthSubmit}>
            <h2>{isRegisterMode ? '注册账号' : '登录账号'}</h2>

            {isRegisterMode && (
              <input
                type="text"
                placeholder="用户名"
                value={authForm.username}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            )}

            <input
              type="email"
              placeholder="邮箱"
              value={authForm.email}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />

            <input
              type="password"
              placeholder="密码（至少8位）"
              value={authForm.password}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={8}
            />

            <button className="primary" type="submit">{isRegisterMode ? '注册并登录' : '登录'}</button>

            <button type="button" className="link-btn" onClick={() => setIsRegisterMode((v) => !v)}>
              {isRegisterMode ? '已有账号？去登录' : '没有账号？去注册'}
            </button>

            {!isRegisterMode && (
              <button type="button" className="link-btn" onClick={() => setShowResetPassword(true)}>
                忘记密码？
              </button>
            )}
          </form>
        ) : (
          <form className="auth-card" onSubmit={handleConfirmReset}>
            <h2>重置密码</h2>
            <input
              type="email"
              placeholder="邮箱"
              value={resetForm.email}
              onChange={(e) => setResetForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <div className="code-row">
              <input
                type="text"
                placeholder="验证码"
                value={resetForm.code}
                onChange={(e) => setResetForm((prev) => ({ ...prev, code: e.target.value }))}
                required
              />
              <button type="button" onClick={handleSendResetCode}>发送验证码</button>
            </div>
            <input
              type="password"
              placeholder="新密码（至少8位）"
              value={resetForm.newPassword}
              onChange={(e) => setResetForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              required
              minLength={8}
            />
            <button className="primary" type="submit">确认重置</button>
            <button type="button" className="link-btn" onClick={() => setShowResetPassword(false)}>
              返回登录
            </button>
          </form>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="app timeline-app">
      <div className="header">
        <div className="header-user-settings">
          <button
            type="button"
            className="settings-trigger"
            onClick={() => setShowUserSettings((prev) => !prev)}
          >
            {user.username}
          </button>
          {showUserSettings && (
            <div className="settings-menu">
              <div className="settings-user-info">
                <div>{user.email}</div>
              </div>
              <button type="button" onClick={handleSettings}>设置</button>
              <button type="button" onClick={handleHelp}>使用说明</button>
              <button type="button" onClick={handleLogout}>退出登录</button>
            </div>
          )}
        </div>
        <h1>24 Hour Tracker</h1>
        <p>每小时都有自己的价值</p>
      </div>

      {activePage === 'settings' && (
        <div className="page-shell">
          <aside className="page-sidebar">
            <button
              className={`page-nav-item ${settingsTab === 'username' ? 'active' : ''}`}
              onClick={() => setSettingsTab('username')}
            >
              修改用户名
            </button>
            <button
              className={`page-nav-item ${settingsTab === 'export' ? 'active' : ''}`}
              onClick={() => setSettingsTab('export')}
            >
              Markdown 导出路径
            </button>
          </aside>
          <section className="page-content">
            <div className="page-content-header">
              <h2>设置中心</h2>
              <button type="button" onClick={() => setActivePage('tracker')}>返回主页</button>
            </div>

            {settingsTab === 'username' ? (
              <form className="settings-form" onSubmit={handleSaveUsername}>
                <label>新用户名</label>
                <input
                  value={profileForm.username}
                  onChange={(e) => setProfileForm({ username: e.target.value })}
                  placeholder="请输入新用户名"
                />
                <button type="submit">保存用户名</button>
              </form>
            ) : (
              <form className="settings-form" onSubmit={handleSaveExportPath}>
                <label>Markdown 导出路径</label>
                <input
                  value={exportForm.markdownPath}
                  onChange={(e) => setExportForm({ markdownPath: e.target.value })}
                  placeholder="例如 exports/review"
                />
                <button type="submit">保存路径</button>
              </form>
            )}
          </section>
        </div>
      )}

      {activePage === 'help' && (
        <div className="page-shell">
          <aside className="page-sidebar">
            <button className={`page-nav-item ${helpTab === 'overview' ? 'active' : ''}`} onClick={() => setHelpTab('overview')}>概览</button>
            <button className={`page-nav-item ${helpTab === 'timeline' ? 'active' : ''}`} onClick={() => setHelpTab('timeline')}>时间轴填写</button>
            <button className={`page-nav-item ${helpTab === 'tasks' ? 'active' : ''}`} onClick={() => setHelpTab('tasks')}>任务管理</button>
            <button className={`page-nav-item ${helpTab === 'review' ? 'active' : ''}`} onClick={() => setHelpTab('review')}>复盘与导出</button>
          </aside>
          <section className="page-content">
            <div className="page-content-header">
              <h2>使用说明</h2>
              <button type="button" onClick={() => setActivePage('tracker')}>返回主页</button>
            </div>
            {helpTab === 'overview' && <div className="help-content">本系统用于按小时记录目标与执行结果，并支持每日复盘导出。

左侧导航类似“文件列表”，点击不同条目时，右侧会展示对应的说明内容。</div>}
            {helpTab === 'timeline' && <div className="help-content">时间轴填写：
1. 点击某个小时块展开编辑区；
<br/>
2. 填写预期目标、实际完成、评分与备注；<br/>
3. 根据实际情况定义颜色，颜色含义如下：<br/>
   - 蓝色：学习与自我提升，特征在于**知识输入型**，吸收知识<br/>
   - 红色：事业与工作，特征在于**劳动输出型**，对社会创造价值<br/>
   - 绿色：生活与健康，身体健康、卫生打扫，特征在于**对内在身体（物理）的关注**<br/>
   - 黄色：家庭与社交与健康娱乐，特征在于**对内在情感（心理）的关注**<br/>
   - 白色：写日记、统计时间、询问使用时间的意义，特征在于对过往的时间进行总结优化<br/>
   - 灰色：潜能色，自己觉得时间浪费掉了的时间<br/>  
   - 黑色：未设定类型的时间默认为黑色<br/>
   睡眠时间论外，不统计在内<br/>
4. 页面会自动保存该小时数据。<br/>
5. 建议每日蓝色+红色与绿色+黄色块数尽量为1:1，这样有利于平衡生活与工作，同时也有利于身心健康。<br/>
6. 若灰色+黑色块数过多，建议重新审视自己的时间使用情况，是否存在时间浪费的情况。</div>}
            {helpTab === 'tasks' && <div className="help-content">任务管理：
1. 在输入框中输入任务并回车/点击“新增”；<br/>
2. 双击任务文本可改名；<br/>
3. 点击 ○ 标记完成；<br/>
4. 点击“删除”移除任务。<br/>
5. 同时正在执行的任务最多3条，超过3条后，需要先完成当前任务，才能新增任务。</div>}
            {helpTab === 'review' && <div className="help-content">复盘与导出：
1. 点击“生成复盘”整理当日总结；
2. 点击“导出 Markdown”下载文档；
3. 导出文件名遵循设置中的 Markdown 导出路径。</div>}
          </section>
        </div>
      )}

      {activePage === 'tracker' && (
        <>
      <div className="date-nav">
        <button onClick={prevDay}>&larr; 前一天</button>
        <button onClick={today}>今天</button>
        <button onClick={nextDay}>后一天 &rarr;</button>
        <span className="current-date">{currentDate}</span>
      </div>

      <div className="top-panels">
        <div className="stats-panel">
          <div>
            <span className="stat-blue">蓝色</span>+
            <span className="stat-red">红色</span>
            块数：{blueRedCount}
          </div>
          <div>
            <span className="stat-green">绿色</span>+
            <span className="stat-yellow">黄色</span>
            块数：{greenYellowCount}
          </div>
          <div>
            <span className="stat-black">黑色</span>+
            <span className="stat-gray">灰色</span>
            块数：{blackGrayCount}
          </div>
          <div>比例为 {ratio}</div>
        </div>

        <div className="task-panel">
          <h3>今日任务</h3>
          <div className="task-input-row">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="输入任务后回车/点击新增"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTask();
                }
              }}
            />
            <button onClick={handleAddTask}>新增</button>
          </div>
          {tasksLoading ? <div className="loading">加载中...</div> : null}
          <div className="task-list-wrapper">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onRename={handleTaskRename}
                onComplete={handleTaskComplete}
                onDelete={handleTaskDelete}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="today-review">
        <div className="actions">
          <button className="primary" onClick={handleGenerateReview}>生成复盘</button>
          <button onClick={handleExport}>导出 Markdown</button>
          <button onClick={handleTodayReview}>今日心得</button>
          <button onClick={handleTodayDiary}>日记</button>
        </div>
      </div>

      {loading ? <div className="loading">加载中...</div> : null}

      <div className="timeline-list">
        {blocks.map((block) => (
          <HourBlock
            key={block.hour}
            block={block}
            expanded={block.hour === expandedHour}
            onToggle={(hour) => setExpandedHour((prevHour) => (prevHour === hour ? null : hour))}
            onChange={handleBlockChange}
          />
        ))}
      </div>

      {showReview && (
        <ReviewModal
          date={currentDate}
          onClose={() => setShowReview(false)}
          onExport={handleExport}
        />
      )}
        </>
      )}

      <DailyNoteModal
        open={Boolean(noteModalType)}
        title={noteModalType === 'today_review' ? `今日心得 - ${currentDate}` : `日记 - ${currentDate}`}
        initialValue={noteModalType ? dailyNotes[noteModalType] : ''}
        loading={dailyNotesLoading}
        saving={dailyNotesSaving}
        onClose={() => setNoteModalType(null)}
        onSave={handleSaveDailyNote}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
