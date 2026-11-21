import { useRef, useState } from 'react';
import * as db from '../db';
import { todayKey } from '../date';
import { Choice, MedicalNotice, PageHeader } from '../components/Common';
import { useFeedback } from '../components/Feedback';
import { InstallGuide } from '../components/InstallGuide';
import { ItemEditor } from '../components/ItemEditor';
import { navigate } from '../router';
import { useApp } from '../store';
import { BackupError, buildBackup, parseBackup } from '../logic/backup';
import { isIOS, isStandalone, notificationSupported, requestPermission } from '../reminder';

export function SettingsScreen({ sub }: { sub?: string }) {
  const app = useApp();
  if (sub === 'symptoms') {
    return (
      <div className="page">
        <PageHeader title="증상 목록 바꾸기" onBack={() => navigate('/settings')} />
        <ItemEditor kind="증상" defs={app.symptomDefs} onChange={app.setSymptomDefs} defaultIcon="⭐" />
      </div>
    );
  }
  if (sub === 'habits') {
    return (
      <div className="page">
        <PageHeader title="습관 목록 바꾸기" onBack={() => history.length > 1 ? history.back() : navigate('/settings')} />
        <ItemEditor kind="습관" defs={app.habitDefs} onChange={app.setHabitDefs} defaultIcon="✅" />
      </div>
    );
  }
  if (sub === 'install') {
    return (
      <div className="page">
        <PageHeader title="홈 화면에 추가하기" onBack={() => navigate('/settings')} />
        <InstallGuide />
      </div>
    );
  }
  return <SettingsMain />;
}

function SettingsMain() {
  const { settings, updateSettings, symptomDefs, habitDefs, reload } = useApp();
  const { toast, confirm } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifMsg, setNotifMsg] = useState('');

  const toggleReminder = async (on: boolean) => {
    if (!on) {
      await updateSettings({ reminder: { ...settings.reminder, enabled: false } });
      setNotifMsg('');
      return;
    }
    const p = await requestPermission();
    if (p === 'granted') {
      await updateSettings({ reminder: { ...settings.reminder, enabled: true } });
      setNotifMsg('알림을 켰어요.');
    } else if (p === 'unsupported') {
      setNotifMsg(
        isIOS() && !isStandalone()
          ? '아이폰은 먼저 홈 화면에 추가한 뒤, 홈 화면의 앱에서 알림을 켤 수 있어요.'
          : '이 브라우저에서는 알림을 쓸 수 없어요.',
      );
    } else {
      setNotifMsg('알림이 허용되지 않았어요. 휴대폰 설정에서 이 앱(또는 브라우저)의 알림을 허용해 주세요.');
    }
  };

  const exportBackup = async () => {
    const data = buildBackup(await db.getAllLogs(), symptomDefs, habitDefs, settings);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `갱년기기록-백업-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`기록 ${data.logs.length}일치를 백업 파일로 만들었어요 ✓`);
  };

  const importBackup = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const ok = await confirm({
        title: '백업 파일로 바꿀까요?',
        message: `백업 파일에 기록 ${data.logs.length}일치가 있어요. 지금 휴대폰에 있는 기록은 모두 이 파일 내용으로 바뀌어요.`,
        okText: '바꾸기',
        cancelText: '그만두기',
      });
      if (!ok) return;
      await db.replaceAll(data);
      await reload();
      toast('백업 파일에서 기록을 되살렸어요 ✓');
    } catch (e) {
      console.error('백업 복원 실패', e);
      await confirm({
        title: '불러오지 못했어요',
        message: e instanceof BackupError ? e.message : '파일을 읽는 중에 문제가 생겼어요.',
        okText: '확인',
        cancelText: '닫기',
      });
    }
  };

  const deleteAll = async () => {
    const first = await confirm({
      title: '모든 기록을 지울까요?',
      message: '증상, 기분, 습관 기록과 설정이 모두 지워져요.',
      okText: '지우기',
      cancelText: '그만두기',
      danger: true,
    });
    if (!first) return;
    const second = await confirm({
      title: '한 번 더 확인할게요',
      message: '지운 기록은 되살릴 수 없어요. 백업 파일이 없다면 먼저 만들어 두세요. 정말 지울까요?',
      okText: '네, 모두 지울게요',
      cancelText: '그만두기',
      danger: true,
    });
    if (!second) return;
    await db.clearAll();
    await reload();
    navigate('/today');
  };

  return (
    <div className="page">
      <PageHeader title="설정" onBack={() => navigate('/today')} />

      <section className="section">
        <h2>글씨 크기</h2>
        <Choice<1 | 1.2>
          label="글씨 크기"
          columns={2}
          options={[
            { value: 1, label: '보통' },
            { value: 1.2, label: '크게' },
          ]}
          value={settings.fontScale}
          onChange={(v) => updateSettings({ fontScale: v })}
        />
      </section>

      <section className="section">
        <h2>매일 기록 알림</h2>
        <Choice<'on' | 'off'>
          label="매일 기록 알림"
          columns={2}
          options={[
            { value: 'on', label: '켜기' },
            { value: 'off', label: '끄기' },
          ]}
          value={settings.reminder.enabled ? 'on' : 'off'}
          onChange={(v) => toggleReminder(v === 'on')}
        />
        {settings.reminder.enabled && (
          <label className="field">
            알림 받을 시간
            <input
              type="time"
              className="text-input"
              value={settings.reminder.time}
              onChange={(e) => e.target.value && updateSettings({ reminder: { ...settings.reminder, time: e.target.value } })}
            />
          </label>
        )}
        {notifMsg && <p className="hint strong" role="status">{notifMsg}</p>}
        <p className="hint">
          알림은 앱을 연 적이 있고 휴대폰이 앱을 아직 닫지 않았을 때만 와요. 앱이 완전히 닫혀 있으면 오지 않을 수 있어요.
          {notificationSupported() ? '' : ' 이 브라우저는 알림을 지원하지 않아요.'}
          {' '}꼭 챙기고 싶다면 휴대폰의 알람(시계 앱)을 함께 맞춰 두시면 좋아요.
        </p>
        {isIOS() && <p className="hint">아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요.</p>}
      </section>

      <section className="section">
        <h2>목록 바꾸기</h2>
        <div className="menu-list">
          <button className="menu-item" onClick={() => navigate('/settings/symptoms')}>증상 목록 바꾸기<span aria-hidden="true">›</span></button>
          <button className="menu-item" onClick={() => navigate('/settings/habits')}>습관 목록 바꾸기<span aria-hidden="true">›</span></button>
        </div>
      </section>

      <section className="section">
        <h2>백업과 되살리기</h2>
        <p className="hint">휴대폰을 바꾸기 전에 백업 파일을 만들어 카카오톡 '나와의 채팅' 등에 보내 두세요. 새 휴대폰에서 그 파일로 되살릴 수 있어요.</p>
        <div className="menu-list">
          <button className="menu-item" onClick={exportBackup}>백업 파일 만들기<span aria-hidden="true">💾</span></button>
          <button className="menu-item" onClick={() => fileRef.current?.click()}>백업 파일로 되살리기<span aria-hidden="true">📂</span></button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="백업 파일 고르기"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importBackup(f);
          }}
        />
      </section>

      <section className="section">
        <h2>도움말</h2>
        <div className="menu-list">
          <button className="menu-item" onClick={() => navigate('/settings/install')}>홈 화면에 추가하는 방법<span aria-hidden="true">›</span></button>
        </div>
      </section>

      <section className="section">
        <h2>모든 기록 지우기</h2>
        <button className="btn btn-danger-outline btn-block" onClick={deleteAll}>모든 기록 지우기</button>
      </section>

      <section className="section about">
        <h2>앱 정보</h2>
        <p>내 몸 기록 (갱년기 케어) · 1.0</p>
        <p className="hint">기록은 이 휴대폰 안에만 저장되고, 어디로도 보내지 않아요. 광고나 추적 장치가 없어요.</p>
        <MedicalNotice />
      </section>
    </div>
  );
}
