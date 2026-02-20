
// SVG 이미지를 Base64 코드로 변환하여 별도 파일 저장 없이 렌더링합니다.

const svgToBase64 = (str: string) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(str)))}`;

// 헤더 로고: "예방접종 오피셜 봇" (기존 SVG는 백업용으로 유지하거나 필요 없으면 제거 가능)
// export const HEADER_LOGO_URL = svgToBase64(headerSvg.trim());

// 인트로 배너: "예방접종 오피셜 봇" (3D 강조형)
const bannerSvg = `
<svg width="600" height="320" viewBox="0 0 600 320" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg_grad" x1="0" y1="0" x2="600" y2="320" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#EBF5FF"/>
      <stop offset="1" stop-color="#F8FAFC"/>
    </linearGradient>
    <linearGradient id="text_grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3B82F6"/>
      <stop offset="1" stop-color="#1D4ED8"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="2" flood-color="#BFDBFE"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="600" height="320" rx="24" fill="url(#bg_grad)"/>
  
  <!-- Decorative Elements -->
  <circle cx="50" cy="50" r="30" fill="#DBEAFE" opacity="0.6"/>
  <circle cx="550" cy="270" r="40" fill="#DBEAFE" opacity="0.6"/>
  <path d="M520 60 L540 40 M530 70 L550 50" stroke="#93C5FD" stroke-width="3" stroke-linecap="round"/>
  
  <!-- Top Text -->
  <text x="300" y="80" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="16" fill="#64748B" font-weight="600">
    예방접종에 대해 궁금하신 내용을 말씀해주세요.
  </text>
  
  <!-- Badge -->
  <rect x="135" y="100" width="330" height="34" rx="17" fill="#DBEAFE"/>
  <text x="300" y="123" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="14" fill="#2563EB" font-weight="700">
    질병관리청 공식 자료를 기반으로 답변 해드립니다.
  </text>
  
  <!-- Main Title (3D Effect) -->
  <text x="300" y="210" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="52" font-weight="900" fill="url(#text_grad)" letter-spacing="-2" filter="url(#shadow)">
    예방접종 오피셜 봇
  </text>
  
  <!-- Robot Icon Hint -->
  <circle cx="300" cy="270" r="4" fill="#3B82F6"/>
  <circle cx="280" cy="270" r="4" fill="#CBD5E1"/>
  <circle cx="320" cy="270" r="4" fill="#CBD5E1"/>
</svg>
`;

export const HEADER_LOGO_URL = '/header-logo.png';
export const INTRO_BANNER_URL = '/main-banner.png';
