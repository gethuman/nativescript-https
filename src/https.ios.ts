import {
    Utils,
    File,
    ImageSource
} from "@nativescript/core";
import * as Https from "./https.common";

let cache: NSURLCache;

export function setCache(options?: Https.CacheOptions) {
    if (options) {
        cache = NSURLCache.alloc().initWithMemoryCapacityDiskCapacityDirectoryURL(
            options.memorySize,
            options.diskSize,
            NSURL.URLWithString(options.diskLocation)
        );
    } else {
        cache = null;
    }
    NSURLCache.sharedURLCache = cache;
}
export function clearCache() {
    NSURLCache.sharedURLCache.removeAllCachedResponses();
}

interface Ipolicies {
    def: AFSecurityPolicy;
    secured: boolean;
    secure?: AFSecurityPolicy;
}

let policies: Ipolicies = {
    def: AFSecurityPolicy.defaultPolicy(),
    secured: false,
};

policies.def.allowInvalidCertificates = true;
policies.def.validatesDomainName = false;

export function enableSSLPinning(options: Https.HttpsSSLPinningOptions) {
    if (!policies.secure) {
        policies.secure = AFSecurityPolicy.policyWithPinningMode(
            AFSSLPinningMode.PublicKey
        );
        policies.secure.allowInvalidCertificates = Utils.isDefined(
            options.allowInvalidCertificates
        )
            ? options.allowInvalidCertificates
            : false;
        policies.secure.validatesDomainName = Utils.isDefined(
            options.validatesDomainName
        )
            ? options.validatesDomainName
            : true;
        let data = NSData.dataWithContentsOfFile(options.certificate);
        policies.secure.pinnedCertificates = NSSet.setWithObject(data);
    }
    policies.secured = true;
}

export function disableSSLPinning() {
    policies.secured = false;
}

function nativeToObj(data) {
    let content: any;
    if (data instanceof NSDictionary) {
        content = {};
        data.enumerateKeysAndObjectsUsingBlock((key, value, stop) => {
            content[key] = nativeToObj(value);
        });
        return content;
    } else if (data instanceof NSArray) {
        content = [];
        data.enumerateObjectsUsingBlock((value, index, stop) => {
            content[index] = nativeToObj(value);
        });
        return content;
    } else if (data instanceof NSData) {
        return NSString.alloc()
            .initWithDataEncoding(data, NSASCIIStringEncoding)
            .toString();
    } else {
        return data;
    }
}

function getData(data) {
    let content: any;
    if (data && data.class) {
        if (
            data.enumerateKeysAndObjectsUsingBlock ||
            <any>data instanceof NSArray
        ) {
            let serial = NSJSONSerialization.dataWithJSONObjectOptionsError(
                data,
                NSJSONWritingOptions.PrettyPrinted
            );
            content = NSString.alloc()
                .initWithDataEncoding(serial, NSUTF8StringEncoding)
                .toString();
        } else if (<any>data instanceof NSData) {
            content = NSString.alloc()
                .initWithDataEncoding(data, NSASCIIStringEncoding)
                .toString();
        } else {
            content = data;
        }

        try {
            content = JSON.parse(content);
        } catch (ignore) {}
    } else if (typeof data === "object") {
        content = JSON.stringify(data);
    } else {
        content = data;
    }
    return content;
}

class HttpsResponse implements Https.HttpsResponseLegacy {
    //     private callback?: com.nativescript.https.OkhttpResponse.OkHttpResponseAsyncCallback;
    constructor(
        private data: NSDictionary<string, any> & NSData & NSArray<any>,
        private url: string
    ) {}
    toArrayBufferAsync(): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }
    //     getCallback(resolve, reject) {
    //         return {
    //             onBitmap(res) {
    //                 resolve(new ImageSource(res));
    //             },
    //             onString(res) {
    //                 resolve(res);
    //             },
    //             onByteArray(res) {
    //                 resolve((ArrayBuffer as any).from(res));
    //             },
    //             onFile(res) {
    //                 resolve(res);
    //             },
    //             onException(err) {
    //                 reject(err);
    //             },
    //         };
    //     }
    //     toArrayBuffer() {
    //         return (ArrayBuffer as any).from(this.response.toByteArray());
    //     }
    //     toArrayBufferAsync() {
    //         return new Promise((resolve, reject) => {
    //             this.response.toByteArrayAsync(this.getCallback(resolve, reject));
    //         });
    //     }

    //     toString(encoding?: HttpResponseEncoding) {
    //         return this.response.toString();
    //     }
    //     toStringAsync() {
    //         return new Promise((resolve, reject) => {
    //             this.response.toStringAsync(this.getCallback(resolve, reject));
    //         });
    //     }
    //     toJSON(encoding?: HttpResponseEncoding) {
    //         return parseJSON(this.response.toString());
    //     }

    //     toJSONAsync() {
    //         return new Promise<string>((resolve, reject) => {
    //             this.response.toStringAsync(this.getCallback(resolve, reject));
    //         }).then(parseJSON);
    //     }
    //     toImage() {
    //         return new Promise<any>((resolveImage, rejectImage) => {
    //             try {
    //                 const image = this.response.toBitmap();
    //                 resolveImage(new ImageSource(image));
    //             } catch (err) {
    //                 rejectImage(err);
    //             }
    //         });
    //     }
    //     toImageAsync() {
    //         return new Promise((resolve, reject) => {
    //             this.response.toBitmapAsync(this.getCallback(resolve, reject));
    //         });
    //     }
    //     toFile(destinationFilePath: string) {
    //         if (!destinationFilePath) {
    //             destinationFilePath = getFilenameFromUrl(this.url);
    //         }
    //         return this.response.toFile(destinationFilePath);
    //     }
    //     toFileAsync(destinationFilePath: string) {
    //         if (!destinationFilePath) {
    //             destinationFilePath = getFilenameFromUrl(this.url);
    //         }
    //         return new Promise((resolve, reject) => {
    //             this.response.toFileAsync(
    //                 destinationFilePath,
    //                 this.getCallback(resolve, reject)
    //             );
    //         });
    //     }

    arrayBuffer: ArrayBuffer;
    toArrayBuffer() {
        if (this.arrayBuffer) {
            return this.arrayBuffer;
        }
        if (this.data instanceof NSData) {
            this.arrayBuffer = interop.bufferFromData(this.data);
        } else {
            this.arrayBuffer = interop.bufferFromData(
                NSKeyedArchiver.archivedDataWithRootObject(this.data)
            );
        }
        return this.arrayBuffer;
    }
    stringResponse: string;
    toString(encoding?: any) {
        if (this.stringResponse) {
            return this.stringResponse;
        }
        if (this.jsonResponse) {
            this.stringResponse = JSON.stringify(this.jsonResponse);
            return this.stringResponse;
        }
        if (typeof this.data === "string") {
            this.stringResponse = this.data;
            return this.data;
        } else {
            const data = nativeToObj(this.data);
            if (typeof data === "string") {
                this.stringResponse = data;
            } else {
                this.jsonResponse = data;
                this.stringResponse = JSON.stringify(data);
            }
            return this.stringResponse;
        }
    }
    toStringAsync(encoding?: any) {
        return Promise.resolve(this.toString(encoding));
    }
    jsonResponse: any;
    toJSON(encoding?: any) {
        if (this.jsonResponse) {
            return this.jsonResponse;
        }
        if (this.stringResponse) {
            this.jsonResponse = Https.parseJSON(this.stringResponse);
            return this.jsonResponse;
        }
        const data = nativeToObj(this.data);
        if (typeof data === "object") {
            this.jsonResponse = data;
            return data;
        }
        try {
            this.stringResponse = data;
            this.jsonResponse = Https.parseJSON(data);
            return this.jsonResponse;
        } catch (err) {
            console.error("HttpsResponse.toJSON", err);
            return null;
        }
    }
    toJSONAsync(): Promise<any> {
        return Promise.resolve(this.toJSON());
    }
    imageSource: ImageSource;
    toImage(): Promise<ImageSource> {
        if (this.imageSource) {
            return Promise.resolve(this.imageSource);
        }
        return new Promise<ImageSource>((resolve, reject) => {
            (<any>UIImage).tns_decodeImageWithDataCompletion(
                this.data,
                (image) => {
                    if (image) {
                        resolve(new ImageSource(image));
                    } else {
                        reject(
                            new Error(
                                "Response content may not be converted to an Image"
                            )
                        );
                    }
                }
            );
        }).then((r) => {
            this.imageSource = r;
            return r;
        });
    }
    file: File;
    toFile(destinationFilePath?: string): Promise<File> {
        if (this.file) {
            return Promise.resolve(this.file);
        }
        return new Promise<File>((resolve, reject) => {
            if (!destinationFilePath) {
                destinationFilePath = Https.getFilenameFromUrl(this.url);
            }
            if (this.data instanceof NSData) {
                // ensure destination path exists by creating any missing parent directories
                const file = File.fromPath(destinationFilePath);

                const result = this.data.writeToFileAtomically(
                    destinationFilePath,
                    true
                );
                if (resolve) {
                    resolve(file);
                } else {
                    reject(
                        new Error(
                            `Cannot save file with path: ${destinationFilePath}.`
                        )
                    );
                }
            } else {
                reject(
                    new Error(
                        `Cannot save file with path: ${destinationFilePath}.`
                    )
                );
            }
        }).then((f) => {
            this.file = f;
            return f;
        });
    }
}

// function AFSuccess(
//     resolve,
//     task: NSURLSessionDataTask,
//     url: string,
//     useLegacy: boolean,
//     data?: NSDictionary<string, any> & NSData & NSArray<any>
// ) {
//     let content = useLegacy ? newz& HttpsResponse(data, url) : getData(data);
//     resolve({ task, content });
// }

function AFFailure(
    resolve,
    reject,
    task: NSURLSessionDataTask,
    error: NSError,
    useLegacy: boolean,
    url
) {
    if (error.code === -999) {
        return reject(new Error(error.localizedDescription));
    }
    let getHeaders = () => ({});
    let sendi = {
        task,
        reason: error.localizedDescription,
        get headers() {
            return getHeaders();
        },
    } as Https.HttpsResponse;
    let response = error.userInfo.valueForKey(
        AFNetworkingOperationFailingURLResponseErrorKey
    ) as NSHTTPURLResponse;
    if (!Utils.isNullOrUndefined(response)) {
        sendi.statusCode = response.statusCode;
        getHeaders = function () {
            let dict = response.allHeaderFields;
            if (dict) {
                const headers = {};
                dict.enumerateKeysAndObjectsUsingBlock(
                    (k, v) => (headers[k] = v)
                );
                return headers;
            }
            return null;
        };
    }

    let data: NSDictionary<string, any> &
        NSData &
        NSArray<any> = error.userInfo.valueForKey(
        AFNetworkingOperationFailingURLResponseDataErrorKey
    );
    let parsedData = getData(data);
    const failingURL = error.userInfo.objectForKey("NSErrorFailingURLKey");
    if (useLegacy) {
        if (!sendi.statusCode) {
           return reject(error.localizedDescription);
        }
        let failure: any = {
            description: error.description,
            reason: error.localizedDescription,
            url: failingURL ? failingURL.description : url,
        };
        if (policies.secured === true) {
            failure.description =
                "nativescript-https > Invalid SSL certificate! " +
                error.description;
        }
        sendi.failure = failure;
        sendi.content = new HttpsResponse(data, url);
        resolve(sendi);
    } else {
        let response: any = {
            body: parsedData,
            description: error.description,
            reason: error.localizedDescription,
            url: failingURL ? failingURL.description : url,
        };

        if (policies.secured === true) {
            response.description =
                "nativescript-https > Invalid SSL certificate! " +
                response.description;
        }
        sendi.content = parsedData;
        sendi.response = response;

        resolve(sendi);
    }
}

function bodyToNative(cont) {
    let dict;
    if (Array.isArray(cont)) {
        dict = NSArray.arrayWithArray(cont.map((item) => bodyToNative(item)));
        // cont.forEach(function(item, idx) {
        //     dict.addObject(bodyToNative(item));
        // });
    } else if (Utils.isObject(cont)) {
        dict = NSMutableDictionary.new<string, any>();
        Object.keys(cont).forEach((key) =>
            dict.setValueForKey(bodyToNative(cont[key]), key)
        );
    } else {
        dict = cont;
    }
    return dict;
}
export function createRequest(
    opts: Https.HttpsRequestOptions
): Https.HttpsRequest {
    const manager = AFHTTPSessionManager.alloc().initWithBaseURL(
        NSURL.URLWithString(opts.url)
    );
    const type =
        opts.headers && opts.headers["Content-Type"]
            ? <string>opts.headers["Content-Type"]
            : "application/json";
    if (type.startsWith("application/json")) {
        manager.requestSerializer = AFJSONRequestSerializer.serializer();
        manager.responseSerializer = AFJSONResponseSerializer.serializerWithReadingOptions(
            NSJSONReadingOptions.AllowFragments
        );
    } else {
        manager.requestSerializer = AFHTTPRequestSerializer.serializer();
        manager.responseSerializer = AFHTTPResponseSerializer.serializer();
    }
    manager.requestSerializer.allowsCellularAccess = true;
    manager.requestSerializer.HTTPShouldHandleCookies = true;
    manager.securityPolicy =
        policies.secured === true ? policies.secure : policies.def;

    if (opts.cachePolicy) {
        switch (opts.cachePolicy) {
            case "noCache":
                manager.setDataTaskWillCacheResponseBlock(
                    (session, task, cacheResponse) => {
                        return null;
                    }
                );
                break;
            case "onlyCache":
                manager.requestSerializer.cachePolicy =
                    NSURLRequestCachePolicy.ReturnCacheDataDontLoad;
                break;
            case "ignoreCache":
                manager.requestSerializer.cachePolicy =
                    NSURLRequestCachePolicy.ReloadIgnoringLocalCacheData;
                break;
        }
    }
    let heads = opts.headers;
    let headers: NSMutableDictionary<string, any> = null;
    if (heads) {
        headers = NSMutableDictionary.dictionary();
        Object.keys(heads).forEach(
            (key) => headers.setValueForKey(heads[key], key)
            // manager.requestSerializer.setValueForHTTPHeaderField(
            //     heads[key] as any,
            //     key
            // )
        );
    }

    let dict = null;
    if (opts.body) {
        dict = bodyToNative(opts.body);
    } else if (opts.content) {
        dict = opts.content;
    }

    manager.requestSerializer.timeoutInterval = opts.timeout
        ? opts.timeout
        : 10;

    const useLegacy = Utils.isDefined(opts.useLegacy) ? opts.useLegacy : false;

    const progress = opts.onProgress
        ? (progress: NSProgress) => {
              opts.onProgress(
                  progress.completedUnitCount,
                  progress.totalUnitCount
              );
          }
        : null;
    let task: NSURLSessionDataTask;

    return {
        get nativeRequest() {
            return task;
        },
        cancel: () => task && task.cancel(),
        run(resolve, reject) {
            const success = function (task: NSURLSessionDataTask, data?: any) {
                // TODO: refactor this code with failure one.
            let content = useLegacy
                    ? new HttpsResponse(data, opts.url)
                    : getData(data);
                let getHeaders = () => ({});
                let sendi: Https.HttpsResponse = {
                    content,
                    get headers() {
                        return getHeaders();
                    },
                };

                let response = task.response as NSHTTPURLResponse;
                if (!Utils.isNullOrUndefined(response)) {
                    sendi.statusCode = response.statusCode;
                    getHeaders = function () {
                        let dict = response.allHeaderFields;
                        if (dict) {
                            const headers = {};
                            dict.enumerateKeysAndObjectsUsingBlock(
                                (k, v) => (headers[k] = v)
                            );
                            return headers;
                        }
                        return null;
                    };
                }
                resolve(sendi);

                // if (AFResponse.reason) {
                //     sendi.reason = AFResponse.reason;
                // }
            };
            const failure = function (task: NSURLSessionDataTask, error: any) {
                AFFailure(resolve, reject, task, error, useLegacy, opts.url);
            };
            if (type.startsWith("multipart/form-data")) {
                switch (opts.method) {
                    case "POST":
                        // we need to remove the Content-Type or the boundary wont be set correctly
                        headers.removeObjectForKey("Content-Type");
                        task = manager.POSTParametersHeadersConstructingBodyWithBlockProgressSuccessFailure(
                            opts.url,
                            null,
                            headers,
                            (formData) => {
                                (opts.body as Https.HttpsFormDataParam[]).forEach(
                                    (param) => {
                                        if (
                                            param.fileName &&
                                            param.contentType
                                        ) {
                                            if (param.data instanceof NSURL) {
                                                formData.appendPartWithFileURLNameFileNameMimeTypeError(
                                                    param.data,
                                                    param.parameterName,
                                                    param.fileName,
                                                    param.contentType
                                                );
                                            } else {
                                                // console.log('addding file data', param.data instanceof NSData);
                                                formData.appendPartWithFileDataNameFileNameMimeType(
                                                    param.data,
                                                    param.parameterName,
                                                    param.fileName,
                                                    param.contentType
                                                );
                                            }
                                        } else {
                                            formData.appendPartWithFormDataName(
                                                NSString.stringWithString(
                                                    param.data
                                                ).dataUsingEncoding(
                                                    NSUTF8StringEncoding
                                                ),
                                                param.parameterName
                                            );
                                        }
                                    }
                                );
                            },
                            progress,
                            success,
                            failure
                        );
                        break;
                    default:
                        throw new Error("method_not_supported_multipart");
                }
            } else {
                switch (opts.method) {
                    case "GET":
                        task = manager.GETParametersHeadersProgressSuccessFailure(
                            opts.url,
                            dict,
                            headers,
                            progress,
                            success,
                            failure
                        );
                        break;
                    case "POST":
                        task = manager.POSTParametersHeadersProgressSuccessFailure(
                            opts.url,
                            dict,
                            headers,
                            progress,
                            success,
                            failure
                        );
                        break;
                    case "PUT":
                        task = manager.PUTParametersHeadersSuccessFailure(
                            opts.url,
                            dict,
                            headers,
                            success,
                            failure
                        );
                        break;
                    case "DELETE":
                        task = manager.DELETEParametersHeadersSuccessFailure(
                            opts.url,
                            dict,
                            headers,
                            success,
                            failure
                        );
                        break;
                    case "PATCH":
                        task = manager.PATCHParametersHeadersSuccessFailure(
                            opts.url,
                            dict,
                            headers,
                            success,
                            failure
                        );
                        break;
                    case "HEAD":
                        task = manager.HEADParametersHeadersSuccessFailure(
                            opts.url,
                            dict,
                            headers,
                            success,
                            failure
                        );
                        break;
                    default:
                        throw new Error("method_not_supported_multipart");
                }
            }
        },
    };
}
export function request(opts: Https.HttpsRequestOptions) {
    return new Promise((resolve, reject) => {
        try {
            createRequest(opts).run(resolve, reject);
        } catch (error) {
            reject(error);
        }
    });
}
