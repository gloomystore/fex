/* eslint-disable @typescript-eslint/no-unused-vars */

interface FexError<T = any> extends Error {
  isFexError: boolean
  response?: FexResponse<T>
  request?: Response
  config: FetchConfig
  cause?: any
}

type FexErrorHandler<T = any> = (error: FexError<T>) => unknown

type XOR<T, U> = (T | U) extends object
  ? (T extends U ? never : T) | (U extends T ? never : U)
  : T | U;

type FetchConfig = Omit<RequestInit, "headers" | "signal"> & {
  headers: Record<string, string>;
  baseURL?: string;
  url?: string;
  timeout?: number;
  cancelToken?: FexCancelToken;
} & XOR<{ mode?: RequestMode }, { withCredentials?: boolean }>;

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
    this.promise = new Promise<void>((resolve) => {
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
        onRejected?: (error: FexError) => unknown
      ) => {
        this.requestInterceptors.push({ onFulfilled, onRejected });
      },
    },
    response: {
      use: (
        onFulfilled: <T>(response: FexResponse<T>) => FexResponse<T> | Promise<FexResponse<T>>,
        onRejected?: FexErrorHandler
      ) => {
        this.responseInterceptors.push({ onFulfilled, onRejected });
      },
    },      
  };

  private requestInterceptors: {
    onFulfilled: (config: FetchConfig) => FetchConfig;
    onRejected?: (error: FexError) => unknown;
  }[] = [];
  private responseInterceptors: {
    onFulfilled: <T>(response: FexResponse<T>) => FexResponse<T> | Promise<FexResponse<T>>;
    onRejected?: FexErrorHandler;
  }[] = [];

  constructor(config: Partial<FetchConfig> = {}) {
    this.defaultConfig = {
      headers: {},
      ...config,
    };
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config: Partial<FetchConfig> = {}
  ): Promise<FexResponse<T>> {
    let mergedConfig: FetchConfig = {
      ...this.defaultConfig,
      ...config,
      method,
      headers: { ...this.defaultConfig.headers, ...config.headers },
    };

    if (mergedConfig.baseURL && !url.startsWith("http")) {
      url =
        mergedConfig.baseURL.replace(/\/$/, "") + "/" + url.replace(/^\//, "");
    }

    mergedConfig.url = url;

    for (const { onFulfilled, onRejected } of this.requestInterceptors) {
      try {
        mergedConfig = onFulfilled(mergedConfig);
      } catch (error) {
        if (onRejected) return Promise.reject(onRejected(error as FexError));
        throw error;
      }
    }

    const headers = new Headers(mergedConfig.headers);
    const controller = new AbortController();
    const timeout = mergedConfig.timeout ?? 0;

    if (timeout > 0) {
      const timeoutSignal = AbortSignal.timeout(timeout);
      if (timeoutSignal.aborted) {
        controller.abort();
      }
      timeoutSignal.addEventListener("abort", () => controller.abort());
    }

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

      let responseData: T;
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        responseData = (await response.json()) as T;
      } else if (contentType.includes("text/")) {
        responseData = (await response.text()) as T;
      } else if (
        contentType.includes("image/") ||
        contentType.includes("application/octet-stream")
      ) {
        responseData = (await response.blob()) as T;
      } else {
        responseData = (await response.blob()) as T;
      }

      const finalResponse: FexResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: mergedConfig,
        request: response,
      };

      for (const { onFulfilled, onRejected } of this.responseInterceptors) {
        try {
          return await onFulfilled<T>(finalResponse);
        } catch (error) {
          if (onRejected) {
            return Promise.reject(onRejected(error as FexError));
          }
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
        if (onRejected) return Promise.reject(onRejected(error as FexError));
      }
      throw error;
    }
  }

  get<T>(url: string, config?: Partial<FetchConfig>) {
    return this.request<T>("GET", url, undefined, config);
  }

  post<T>(url: string, data?: unknown, config?: Partial<FetchConfig>) {
    return this.request<T>("POST", url, data, config);
  }

  put<T>(url: string, data?: unknown, config?: Partial<FetchConfig>) {
    return this.request<T>("PUT", url, data, config);
  }

  patch<T>(url: string, data?: unknown, config?: Partial<FetchConfig>) {
    return this.request<T>("PATCH", url, data, config);
  }

  delete<T>(url: string, config?: Partial<FetchConfig>) {
    return this.request<T>("DELETE", url, undefined, config);
  }

  options<T>(url: string, config?: Partial<FetchConfig>) {
    return this.request<T>("OPTIONS", url, undefined, config);
  }

  create(config: Partial<FetchConfig> = {}) {
    return new FexInstance(config);
  }
}

const fex = new FexInstance();
export default fex;
export { FexCancelToken, FetchConfig, FexResponse, FexError, FexInstance };

