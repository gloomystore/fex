import fex from '../dist/fex';

// ✅ 서버 환경에서만 TLS 인증 무시
if (typeof window === 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ✅ fex 인스턴스 생성
const fexInstance = fex.create({
  baseURL: process.env.API_URL || '', // 환경 변수에서 기본 URL 설정
  timeout: 10000, // 타임아웃 설정 (10초)
  headers: {
    'Content-Type': 'application/json',
    ...(process.env.AUTH ? { 'Authorization': process.env.AUTH } : {}) // ✅ AUTH가 없으면 Authorization 헤더 생략
  },
  mode: 'cors'
});

// ✅ 요청 인터셉터
fexInstance.interceptors.request.use(
  (config) => {
    console.log('📡 요청 보냄:', config.url);

    // ✅ 예: 토큰 추가 (JWT)
    const token = process.env.AUTH ?? '';
    if (token) {
      config.headers.Authorization = token;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 응답 인터셉터
fexInstance.interceptors.response.use(
  (response) => {
    console.log('✅ 응답 받음:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('❌ 요청 실패:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });

    // ✅ 401 에러 발생 시 로그아웃 처리 (클라이언트 환경에서만)
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      console.warn('🔐 인증 만료됨! 로그아웃 처리 필요');
      localStorage.removeItem('accessToken'); // ✅ 서버 환경에서 실행 방지
      window.location.href = '/login'; // 로그인 페이지로 리디렉트
    }

    return Promise.reject(error);
  }
);

export default fexInstance;
