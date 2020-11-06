import { Headers, HttpRequestOptions, ImageSource, File, knownFolders, path } from "@nativescript/core";

export interface HttpsSSLPinningOptions {
    host: string;
    certificate: string;
    allowInvalidCertificates?: boolean;
    validatesDomainName?: boolean;
    commonName?: string;
}
export interface CacheOptions {
    diskLocation: string;
    diskSize: number;
    memorySize?: number;
}

export interface HttpsFormDataParam {
    data: any;
    parameterName: string;
    fileName?: string;
    contentType?: string;
}

export interface HttpsRequestObject {
    [key: string]:
        | string
        | number
        | boolean
        | HttpsRequestObject
        | Array<any>
        | HttpsFormDataParam;
}

export type CachePolicy = "noCache" | "onlyCache" | "ignoreCache";
export interface HttpsRequestOptions extends HttpRequestOptions {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
    headers?: Headers;
    params?: HttpsRequestObject;
    body?: HttpsRequestObject | HttpsFormDataParam[];
    content?: string;
    /**
     * Default 10 (seconds).
     */
    timeout?: number;

    /**
     * On Android large responses may crash the app (fi. https://httpbin.org/bytes/10000).
     * By setting this to true and when not using useLegacy, we allow large responses on the main thread (which this plugin currently does).
     * Note that once set to true, this policy remains active until the app is killed.
     */
    allowLargeResponse?: boolean;

    /**
     * iOS for now
     */
    onProgress?: (current: number, total: number) => void;

    cachePolicy?: CachePolicy;
    useLegacy?: boolean;
}

export interface HttpsResponse {
    headers?: Headers;
    statusCode?: number;
    content?: any;
    reason?: string;
    description?: string;
    url?: string;
    failure?: any;
    response?: any;
}

export interface HttpsRequest {
  nativeRequest;
  cancel();
  run(success, failure);
}

export interface HttpsResponseLegacy {
    toArrayBuffer(): ArrayBuffer;
    toArrayBufferAsync(): Promise<ArrayBuffer>;

    toString(): string;
    toStringAsync(): Promise<string>;
    toJSON(): any;
    toJSONAsync(): Promise<any>;
    toImage(): Promise<ImageSource>;
    // toImageAsync(): Promise<ImageSource>;
    toFile(destinationFilePath: string): Promise<File>;
    // toFileAsync(destinationFilePath: string): Promise<File>;
}

export function getFilenameFromUrl(url: string) {
  const slashPos = url.lastIndexOf("/") + 1;
  const questionMarkPos = url.lastIndexOf("?");

  let actualFileName: string;
  if (questionMarkPos !== -1) {
      actualFileName = url.substring(slashPos, questionMarkPos);
  } else {
      actualFileName = url.substring(slashPos);
  }

  const result = path.join(knownFolders.documents().path, actualFileName);

  return result;
}
export function parseJSON(source: string): any {
  const src = source.trim();
  if (src.lastIndexOf(")") === src.length - 1) {
      return JSON.parse(
          src.substring(src.indexOf("(") + 1, src.lastIndexOf(")"))
      );
  }

  return JSON.parse(src);
}