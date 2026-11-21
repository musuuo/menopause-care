import { useState } from 'react';
import { InstallGuide } from '../components/InstallGuide';
import { useApp } from '../store';
import { MEDICAL_NOTICE } from '../defaults';

export function Onboarding() {
  const { updateSettings } = useApp();
  const [step, setStep] = useState(0);
  const finish = () => updateSettings({ onboarded: true });

  return (
    <div className="page onboarding">
      <div className="step-dots">
        <span className="sr-only">3단계 중 {step + 1}단계</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`step-dot ${i === step ? 'on' : ''}`} aria-hidden="true" />
        ))}
      </div>

      {step === 0 && (
        <section className="onb-slide">
          <div className="onb-art" aria-hidden="true">📝</div>
          <h1>하루 10초, 내 몸을 기록해요</h1>
          <p>기분과 증상을 몇 번만 누르면 기록이 끝나요. 모인 기록은 병원에 가져갈 수 있게 정리해 드려요.</p>
        </section>
      )}
      {step === 1 && (
        <section className="onb-slide">
          <div className="onb-art" aria-hidden="true">🔒</div>
          <h1>기록은 이 휴대폰에만 저장돼요</h1>
          <p>가입도, 로그인도 필요 없어요. 기록은 다른 곳으로 보내지 않아요.</p>
          <p className="hint">휴대폰을 바꿀 때는 설정에서 '백업 파일 만들기'를 해 두세요.</p>
          <p className="notice">{MEDICAL_NOTICE}</p>
        </section>
      )}
      {step === 2 && (
        <section className="onb-slide">
          <h1>홈 화면에 추가해 두세요</h1>
          <p>앱처럼 한 번에 열 수 있어요.</p>
          <InstallGuide />
        </section>
      )}

      <div className="onb-buttons">
        {step < 2 ? (
          <>
            <button className="btn btn-primary btn-block" onClick={() => setStep(step + 1)}>다음</button>
            <button className="link-btn" onClick={finish}>건너뛰고 바로 시작하기</button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-block" onClick={finish}>시작하기</button>
            <button className="link-btn" onClick={() => setStep(1)}>이전으로</button>
          </>
        )}
      </div>
    </div>
  );
}
