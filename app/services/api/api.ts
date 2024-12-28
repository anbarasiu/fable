/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApisauceInstance, create, ApiResponse } from 'apisauce';
import Config from "../../config";
import { getGeneralApiProblem } from "./apiProblem";
import type { ApiConfig } from "./api.types";
import { Book } from '@/models/Book';

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
};

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class api {
  apisauce: ApisauceInstance;
  config: ApiConfig;

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config;
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    });
  }

  async getBooks() {
    try {
      const response: ApiResponse<any> = await this.apisauce.get("/api/books");
      if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        if (problem) return problem;
      }

      const books = response.data;
      return { kind: "ok", books };
    } catch (e) {
      if (__DEV__ && e instanceof Error) {
        console.error(`Bad data: ${e.message}`, e.stack);
      }
      return { kind: "bad-data" };
    }
  }

  async getBook(book: Book) {
    try {
      const response: ApiResponse<any> = await this.apisauce.get(`/api/books/${book.file_name}`);
      if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        if (problem) return problem;
      }
      const bookPath = response.data;
      return { kind: "ok", bookPath };
    } catch (e) {
      if (__DEV__ && e instanceof Error) {
        console.error(`Bad data: ${e.message}`, e.stack);
      }
      return { kind: "bad-data" };
    }
  }
}

export default api;
