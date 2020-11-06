import { Headers, HttpRequestOptions, ImageSource, File } from "@nativescript/core";
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
    [key: string]: string | number | boolean | HttpsRequestObject | Array<any> | HttpsFormDataParam;
}
export declare type CachePolicy = "noCache" | "onlyCache" | "ignoreCache";
export interface HttpsRequestOptions extends HttpRequestOptions {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
    headers?: Headers;
    params?: HttpsRequestObject;
    body?: HttpsRequestObject | HttpsFormDataParam[];
    content?: string;
    timeout?: number;
    allowLargeResponse?: boolean;
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
    nativeRequest: any;
    cancel(): any;
    run(success: any, failure: any): any;
}
export interface HttpsResponseLegacy {
    toArrayBuffer(): ArrayBuffer;
    toArrayBufferAsync(): Promise<ArrayBuffer>;
    toString(): string;
    toStringAsync(): Promise<string>;
    toJSON(): any;
    toJSONAsync(): Promise<any>;
    toImage(): Promise<ImageSource>;
    toFile(destinationFilePath: string): Promise<File>;
}
export declare function getFilenameFromUrl(url: string): string;
export declare function parseJSON(source: string): any;
