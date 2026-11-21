import { useState } from 'react';
import { isIOS, isStandalone } from '../reminder';

type Device = 'iphone' | 'android';

/** 휴대폰 화면 모양 그림. highlight 부분을 강조한다. */
function Phone({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="phone-fig">
      <svg viewBox="0 0 140 220" width="140" height="220" aria-hidden="true">
        <rect x="4" y="4" width="132" height="212" rx="18" fill="#fff" stroke="#3b3330" strokeWidth="4" />
        <rect x="14" y="20" width="112" height="14" rx="7" fill="#ece6e1" />
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const IphoneStep1 = () => (
  <Phone caption="① 화면 아래 가운데 네모에 화살표가 있는 '공유' 단추를 눌러요">
    <rect x="14" y="44" width="112" height="120" rx="6" fill="#f6f1ed" />
    <rect x="4" y="176" width="132" height="40" rx="0" fill="#f1ece8" />
    <circle cx="70" cy="194" r="17" fill="#ffd8a8" stroke="#d9730d" strokeWidth="3" />
    <rect x="62" y="190" width="16" height="13" rx="2" fill="none" stroke="#1f5fa8" strokeWidth="2.5" />
    <path d="M70 196 V182 M65 186 L70 181 L75 186" fill="none" stroke="#1f5fa8" strokeWidth="2.5" strokeLinecap="round" />
  </Phone>
);
const IphoneStep2 = () => (
  <Phone caption="② 메뉴를 위로 밀어 '홈 화면에 추가'를 누르고, 오른쪽 위 '추가'를 눌러요">
    <rect x="14" y="70" width="112" height="130" rx="10" fill="#f1ece8" />
    <rect x="22" y="80" width="96" height="24" rx="5" fill="#fff" />
    <rect x="22" y="110" width="96" height="30" rx="5" fill="#ffd8a8" stroke="#d9730d" strokeWidth="3" />
    <rect x="30" y="118" width="14" height="14" rx="3" fill="none" stroke="#3b3330" strokeWidth="2" />
    <path d="M37 121 V129 M33 125 H41" stroke="#3b3330" strokeWidth="2" />
    <text x="50" y="130" fontSize="10" fill="#1f1a17">홈 화면에 추가</text>
    <rect x="22" y="146" width="96" height="24" rx="5" fill="#fff" />
  </Phone>
);
const AndroidStep1 = () => (
  <Phone caption="① 화면 오른쪽 위 점 세 개(⋮) 단추를 눌러요">
    <rect x="14" y="44" width="112" height="150" rx="6" fill="#f6f1ed" />
    <circle cx="116" cy="27" r="13" fill="#ffd8a8" stroke="#d9730d" strokeWidth="3" />
    <circle cx="116" cy="21" r="2.2" fill="#3b3330" />
    <circle cx="116" cy="27" r="2.2" fill="#3b3330" />
    <circle cx="116" cy="33" r="2.2" fill="#3b3330" />
  </Phone>
);
const AndroidStep2 = () => (
  <Phone caption="② '홈 화면에 추가' 또는 '앱 설치'를 누르고 '추가'를 눌러요">
    <rect x="50" y="38" width="80" height="120" rx="6" fill="#fff" stroke="#ccc" />
    <rect x="56" y="48" width="68" height="16" rx="3" fill="#f1ece8" />
    <rect x="56" y="70" width="68" height="26" rx="4" fill="#ffd8a8" stroke="#d9730d" strokeWidth="3" />
    <text x="60" y="87" fontSize="9" fill="#1f1a17">홈 화면에 추가</text>
    <rect x="56" y="102" width="68" height="16" rx="3" fill="#f1ece8" />
    <rect x="56" y="124" width="68" height="16" rx="3" fill="#f1ece8" />
  </Phone>
);

export function InstallGuide() {
  const [device, setDevice] = useState<Device>(() => (isIOS() ? 'iphone' : 'android'));
  if (isStandalone()) {
    return <p className="hint strong">이미 홈 화면에서 앱으로 열고 계세요. 👍</p>;
  }
  return (
    <div className="install-guide">
      <div className="choice" role="group" aria-label="휴대폰 종류" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className={`choice-btn ${device === 'iphone' ? 'selected' : ''}`} aria-pressed={device === 'iphone'} onClick={() => setDevice('iphone')}>
          아이폰
        </button>
        <button className={`choice-btn ${device === 'android' ? 'selected' : ''}`} aria-pressed={device === 'android'} onClick={() => setDevice('android')}>
          갤럭시 등 안드로이드
        </button>
      </div>
      {device === 'iphone' ? (
        <>
          <p className="hint">꼭 <strong>사파리</strong>로 이 주소를 열어 주세요. 카카오톡에서 열었다면 오른쪽 아래 메뉴에서 '다른 브라우저로 열기'를 눌러요.</p>
          <div className="phone-steps"><IphoneStep1 /><IphoneStep2 /></div>
        </>
      ) : (
        <>
          <p className="hint">꼭 <strong>크롬</strong>이나 <strong>삼성 인터넷</strong>으로 이 주소를 열어 주세요. 카카오톡에서 열었다면 메뉴에서 '다른 브라우저로 열기'를 눌러요.</p>
          <div className="phone-steps"><AndroidStep1 /><AndroidStep2 /></div>
        </>
      )}
      <p className="hint">이제 홈 화면에 생긴 <strong>'내 몸 기록'</strong> 그림을 누르면 바로 열려요.</p>
    </div>
  );
}
