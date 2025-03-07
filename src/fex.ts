type FetchConfig = Omit<RequestInit, "headers" | "signal"> & {
  headers: Record<string, string>;
  baseURL?: string;
  url?: string;
  timeout?: number;
  cancelToken?: FexCancelToken;
};

interface FexResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: FetchConfig;
  request: Response;
}

class FexCancelToken {
  private controller: AbortController;
  promise: Promise<void>;
  reason?: string;

  constructor() {
    this.controller = new AbortController();
    this.promise = new Promise((resolve) => {
      this.cancel = (message?: string) => {
        this.reason = message || "Request canceled";
        this.controller.abort();
        resolve();
      };
    });
  }

  cancel: (message?: string) => void = () => {};

  get signal(): AbortSignal {
    return this.controller.signal;
  }
}

class FexInstance {
  private defaultConfig: FetchConfig;
  interceptors = {
    request: {
      use: (
        onFulfilled: (config: FetchConfig) => FetchConfig,
        onRejected?: (error: any) => any
      ) => {
        this.requestInterceptors.push({ onFulfilled, onRejected });
      },
    },
    response: {
      use: (
        onFulfilled: (
          response: FexResponse
        ) => FexResponse | Promise<FexResponse>,
        onRejected?: (error: any) => any
      ) => {
        this.responseInterceptors.push({ onFulfilled, onRejected });
      },
    },
  };

  private requestInterceptors: {
    onFulfilled: (config: FetchConfig) => FetchConfig;
    onRejected?: (error: any) => any;
  }[] = [];
  private responseInterceptors: {
    onFulfilled: (response: FexResponse) => FexResponse | Promise<FexResponse>;
    onRejected?: (error: any) => any;
  }[] = [];

  constructor(config: Partial<FetchConfig> = {}) {
    this.defaultConfig = {
      headers: {}, // ✅ 기본값을 빈 객체로 설정
      ...config,
    };
  }

  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
    config: Partial<FetchConfig> = {}
  ): Promise<FexResponse<T>> {
    let mergedConfig: FetchConfig = {
      ...this.defaultConfig,
      ...config,
      method,
      headers: { ...this.defaultConfig.headers, ...config.headers }, // ✅ headers를 항상 객체로 유지
    };

    // ✅ baseURL 적용
    if (mergedConfig.baseURL && !url.startsWith("http")) {
      url =
        mergedConfig.baseURL.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }

    mergedConfig.url = url; // ✅ url 속성 추가

    // ✅ 요청 인터셉터 적용
    for (const { onFulfilled, onRejected } of this.requestInterceptors) {
      try {
        mergedConfig = onFulfilled(mergedConfig);
      } catch (error) {
        if (onRejected) return Promise.reject(onRejected(error));
        throw error;
      }
    }

    // ✅ headers를 Headers 객체로 변환 (fetch에 맞게 변환)
    const headers = new Headers(mergedConfig.headers);

    // ✅ AbortController 사용 (타임아웃 & 사용자 취소)
    const controller = new AbortController();
    const timeout = mergedConfig.timeout ?? 0;

    // if (timeout > 0) {
    //   setTimeout(() => controller.abort(), timeout);
    // }

    if (timeout > 0) {
      const timeoutSignal = AbortSignal.timeout(timeout);
      
      // timeoutSignal이 aborted 상태가 되면, controller도 abort 실행
      if (timeoutSignal.aborted) {
        controller.abort();
      }

      timeoutSignal.addEventListener("abort", () => controller.abort());
    }

    // ✅ 사용자가 제공한 cancelToken을 적용
    if (mergedConfig.cancelToken) {
      mergedConfig.cancelToken.promise.then(() => controller.abort());
    }

    const {
      headers: _,
      timeout: __,
      cancelToken: ___,
      ...restConfig
    } = mergedConfig;
    const fetchConfig: RequestInit = {
      headers,
      signal: controller.signal,
      ...restConfig,
    };

    // ✅ body 추가 (GET/HEAD는 body를 사용하지 않음)
    if (data && method !== "GET" && method !== "HEAD") {
      if (data instanceof FormData || data instanceof Blob || data instanceof URLSearchParams) {
          fetchConfig.body = data;
      } else {
          fetchConfig.body = JSON.stringify(data);
          headers.set("Content-Type", "application/json");
      }
    }

    try {
      const response = await fetch(url, fetchConfig);

      // ✅ Content-Type 기반으로 응답 데이터 변환
      let responseData: any;
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else if (contentType.includes("text/")) {
        responseData = await response.text();
      } else if (
        contentType.includes("image/") ||
        contentType.includes("application/octet-stream")
      ) {
        responseData = await response.blob();
      } else {
        // responseData = await response.text();
        responseData = await response.blob();
      }

      const finalResponse: FexResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: mergedConfig,
        request: response,
      };

      // ✅ 응답 인터셉터 적용
      for (const { onFulfilled, onRejected } of this.responseInterceptors) {
        try {
          return await onFulfilled(finalResponse);
        } catch (error) {
          if (onRejected) return onRejected(error);
          throw error;
        }
      }

      return finalResponse;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("⏳ 요청이 타임아웃되었거나 취소되었습니다.");
        return Promise.reject(new Error("Request aborted"));
      }

      for (const { onRejected } of this.responseInterceptors) {
        if (onRejected) return onRejected(error);
      }
      throw error;
    }
  }

  get<T = any>(url: string, config?: Partial<FetchConfig>) {
    return this.request<T>("GET", url, undefined, config);
  }

  post<T = any>(url: string, data?: any, config?: Partial<FetchConfig>) {
    return this.request<T>("POST", url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: Partial<FetchConfig>) {
    return this.request<T>("PUT", url, data, config);
  }

  delete<T = any>(url: string, config?: Partial<FetchConfig>) {
    return this.request<T>("DELETE", url, undefined, config);
  }

  options<T = any>(url: string, config?: Partial<FetchConfig>) {
    return this.request<T>("OPTIONS", url, undefined, config);
  }

  create(config: Partial<FetchConfig> = {}) {
    return new FexInstance(config);
  }
}

// ✅ 기본 인스턴스 생성
const fex = new FexInstance();
export default fex;
export { FexCancelToken };
