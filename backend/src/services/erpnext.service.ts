import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { config, getERPNextAuthHeader } from "../config/erpnext.config.js";

export class ERPNextService {
  private client: AxiosInstance;
  private pendingCookie: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.erpnext.baseUrl,
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Expect": "", // Disable Expect: 100-continue header that causes 417 errors
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Add request interceptor to inject pending cookie
    this.client.interceptors.request.use((config) => {
      if (this.pendingCookie) {
        config.headers.Cookie = this.pendingCookie;
        console.log("=== Axios: Injecting cookie into request ===", {
          url: config.url,
          cookieLength: this.pendingCookie.length,
        });
      }
      return config;
    });
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const userCookie = customHeaders?.userCookie || customHeaders?.cookie || customHeaders?.Cookie;
    
    // Set the pending cookie for the axios interceptor to inject
    if (userCookie) {
      this.pendingCookie = userCookie;
      console.log("=== ERPNextService: Setting pending cookie for axios ===", {
        cookieLength: userCookie.length,
      });
    } else {
      this.pendingCookie = null;
    }

    // Return headers without Cookie (let axios interceptor handle it)
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(this.pendingCookie ? {} : getERPNextAuthHeader()), // Only use service auth if no user cookie
    };
  }

  /**
   * Fetch resources from ERPNext (GET /api/resource/:doctype)
   */
  async getResource<T = any>(
    doctype: string,
    params?: {
      fields?: string[];
      filters?: any[];
      limit_page_length?: number;
      limit_start?: number;
      order_by?: string;
    },
    headers?: Record<string, string>
  ): Promise<{ data: T[]; total_count?: number }> {
    const formattedParams: Record<string, any> = {};
    if (params?.fields) formattedParams.fields = JSON.stringify(params.fields);
    if (params?.filters) formattedParams.filters = JSON.stringify(params.filters);
    if (params?.limit_page_length !== undefined) formattedParams.limit_page_length = params.limit_page_length;
    if (params?.limit_start !== undefined) formattedParams.limit_start = params.limit_start;
    if (params?.order_by) formattedParams.order_by = params.order_by;

    const finalHeaders = this.getHeaders(headers); // This sets this.pendingCookie for axios interceptor

    const response = await this.client.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: formattedParams,
      headers: finalHeaders,
    });

    console.log("=== getResource response ===", {
      doctype,
      statusCode: response.status,
      responseDataLength: response.data.data ? response.data.data.length : 0,
      firstItemKeys: response.data.data && response.data.data[0] ? Object.keys(response.data.data[0]) : [],
    });

    return response.data;
  }

  /**
   * Get single resource detail by name (GET /api/resource/:doctype/:name)
   */
  async getResourceByName<T = any>(doctype: string, name: string, headers?: Record<string, string>): Promise<{ data: T }> {
    const response = await this.client.get(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
      headers: this.getHeaders(headers),
    });
    return response.data;
  }

  /**
   * Create resource (POST /api/resource/:doctype)
   */
  async createResource<T = any>(doctype: string, payload: Record<string, any>, headers?: Record<string, string>): Promise<{ data: T }> {
    const finalHeaders = this.getHeaders(headers); // This sets this.pendingCookie for axios interceptor
    const response = await this.client.post(`/api/resource/${encodeURIComponent(doctype)}`, payload, {
      headers: finalHeaders,
    });
    return response.data;
  }

  /**
   * Update resource (PUT /api/resource/:doctype/:name)
   */
  async updateResource<T = any>(doctype: string, name: string, payload: Record<string, any>, headers?: Record<string, string>): Promise<{ data: T }> {
    const response = await this.client.put(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, payload, {
      headers: this.getHeaders(headers),
    });
    return response.data;
  }

  /**
   * Delete resource (DELETE /api/resource/:doctype/:name)
   */
  async deleteResource(doctype: string, name: string, headers?: Record<string, string>): Promise<any> {
    const response = await this.client.delete(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
      headers: this.getHeaders(headers),
    });
    return response.data;
  }

  /**
   * Execute RPC method (GET or POST /api/method/:methodName)
   */
  async callMethod<T = any>(methodName: string, data?: any, httpMethod: "GET" | "POST" = "POST", headers?: Record<string, string>): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: this.getHeaders(headers),
    };

    if (httpMethod === "GET") {
      config.params = data;
      const response = await this.client.get(`/api/method/${methodName}`, config);
      return response.data;
    } else {
      const response = await this.client.post(`/api/method/${methodName}`, data, config);
      return response.data;
    }
  }

  /**
   * Proxy arbitrary requests directly to ERPNext
   */
  async proxyRequest(method: string, urlPath: string, data?: any, params?: any, headers?: Record<string, string>) {
    const finalHeaders = this.getHeaders(headers); // This sets this.pendingCookie for axios interceptor
    console.log("=== ERPNextService.proxyRequest ===", {
      method,
      urlPath,
      pendingCookie: !!this.pendingCookie,
    });

    const response = await this.client.request({
      method,
      url: urlPath,
      data,
      params,
      headers: finalHeaders,
    });

    console.log("=== ERPNextService.proxyRequest response ===", {
      urlPath,
      statusCode: response.status,
      firstItemKeys: response.data?.data && response.data.data[0] ? Object.keys(response.data.data[0]) : [],
    });

    return response;
  }
}

export const erpnextService = new ERPNextService();
