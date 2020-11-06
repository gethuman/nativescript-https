import { Utils, HttpResponseEncoding, ImageSource, File } from "@nativescript/core";
import * as Https from "./https.common";

interface Ipeer {
    enabled: boolean;
    allowInvalidCertificates: boolean;
    validatesDomainName: boolean;
    host?: string;
    commonName?: string;
    certificate?: string;
    x509Certificate?: java.security.cert.Certificate;
}

let peer: Ipeer = {
    enabled: false,
    allowInvalidCertificates: false,
    validatesDomainName: true,
};

let cache: okhttp3.Cache;

export function setCache(options?: Https.CacheOptions) {
    if (options) {
        cache = new okhttp3.Cache(
            new java.io.File(options.diskLocation),
            options.diskSize
        );
    } else {
        cache = null;
    }
    if (Client) {
        getClient(true);
    }
}
export function clearCache() {
    if (cache) {
        cache.evictAll();
    }
}

let _timeout = 10;

class HttpsResponse implements Https.HttpsResponseLegacy {
    private callback?: com.nativescript.https.OkHttpResponse.OkHttpResponseAsyncCallback;
    constructor(
        private response: com.nativescript.https.OkHttpResponse,
        private tag: string,
        private url: string
    ) {}

    getOrCreateCloseCallback() {
        if (!notClosedResponses[this.tag]) {
            // we need to store handling request to be able to cancel them
            notClosedResponses[this.tag] = this.response;
            this.response.closeCallback = new OkHttpResponse.OkHttpResponseCloseCallback(
                {
                    onClose() {
                        delete notClosedResponses[this.tag];
                    },
                }
            );
        }
    }
    getCallback(resolve, reject) {
        return new com.nativescript.https.OkHttpResponse.OkHttpResponseAsyncCallback(
            {
                onBitmap(res) {
                    resolve(new ImageSource(res));
                },
                onString(res) {
                    resolve(res);
                },
                onByteArray(res) {
                    resolve((ArrayBuffer as any).from(res));
                },
                onFile(res) {
                    resolve(res);
                },
                onException(err) {
                    reject(err);
                },
            }
        );
    }

    // cache it because asking it again wont work as the socket is closed
    arrayBuffer: ArrayBuffer;
    toArrayBuffer() {
        try {
            this.arrayBuffer =
                this.arrayBuffer ||
                (ArrayBuffer as any).from(this.response.toByteArray());
            return this.arrayBuffer;
        } catch {
            return null;
        }
    }
    toArrayBufferAsync(): Promise<ArrayBuffer> {
        if (this.arrayBuffer) {
            return Promise.resolve(this.arrayBuffer);
        }
        return new Promise((resolve, reject) => {
            this.getOrCreateCloseCallback();
            this.response.toByteArrayAsync(this.getCallback(resolve, reject));
        }).then((r: ArrayBuffer) => {
            this.arrayBuffer = r;
            return this.arrayBuffer;
        });
    }

    // cache it because asking it again wont work as the socket is closed
    stringResponse: string;
    toString() {
        try {
            // TODO: handle arraybuffer already stored
            this.stringResponse =
                this.stringResponse || this.response.asString();
            return this.stringResponse;
        } catch {
            return null;
        }
    }
    async toStringAsync(): Promise<string> {
        if (this.stringResponse) {
            return this.stringResponse;
        }
        // TODO: handle arraybuffer already stored
        this.stringResponse = await new Promise<string>((resolve, reject) => {
            this.getOrCreateCloseCallback();
            this.response.asStringAsync(this.getCallback(resolve, reject));
        });
        return this.stringResponse;
    }

    // cache it because asking it again wont work as the socket is closed
    jsonResponse: any;
    toJSON(encoding?: HttpResponseEncoding) {
        try {
            if (this.jsonResponse) {
                return this.jsonResponse;
            }
            // TODO: handle arraybuffer already stored
            this.stringResponse =
                this.stringResponse || this.response.asString();
            this.jsonResponse = Https.parseJSON(this.stringResponse);
            return this.jsonResponse;
        } catch (err) {
            console.error("HttpsResponse.toJSON", err);
            return null;
        }
    }

    async toJSONAsync() {
        if (this.jsonResponse) {
            return this.jsonResponse;
        }
        if (this.stringResponse) {
            this.jsonResponse = Https.parseJSON(this.stringResponse);
            return this.jsonResponse;
        }
        // TODO: handle arraybuffer already stored
        const r = await this.toStringAsync();
        this.jsonResponse = Https.parseJSON(r);
        return this.jsonResponse;
    }

    // cache it because asking it again wont work as the socket is closed
    imageSource: ImageSource;
    async toImage(): Promise<ImageSource> {
        if (this.imageSource) {
            return this.imageSource;
        }
        return new Promise<ImageSource>((resolve, reject) => {
            this.getOrCreateCloseCallback();
            this.response
                .toBitmapAsync(this.getCallback(resolve, reject))
                .then((r) => {
                    this.imageSource = r;
                    return r;
                });
        });
    }
    // toFile(destinationFilePath: string): File {
    //     if (!destinationFilePath) {
    //         destinationFilePath = Https.getFilenameFromUrl(this.url);
    //     }
    //     const file = this.response.toFile(destinationFilePath);
    //     return File.fromPath(destinationFilePath);
    // }
    // cache it because asking it again wont work as the socket is closed
    file: File;
    toFile(destinationFilePath: string): Promise<File> {
        if (this.file) {
            return Promise.resolve(this.file);
        }
        if (!destinationFilePath) {
            destinationFilePath = Https.getFilenameFromUrl(this.url);
        }
        return new Promise((resolve, reject) => {
            this.getOrCreateCloseCallback();
            this.response.toFileAsync(
                destinationFilePath,
                this.getCallback(resolve, reject)
            );
        }).then(() => {
            this.file = File.fromPath(destinationFilePath);
            return this.file;
        });
    }
}

export function enableSSLPinning(options: Https.HttpsSSLPinningOptions) {
    if (!peer.host && !peer.certificate) {
        let certificate: string;
        let inputStream: java.io.FileInputStream;
        try {
            let file = new java.io.File(options.certificate);
            inputStream = new java.io.FileInputStream(file);
            let x509Certificate = java.security.cert.CertificateFactory.getInstance(
                "X509"
            ).generateCertificate(inputStream);
            peer.x509Certificate = x509Certificate;
            certificate = okhttp3.CertificatePinner.pin(x509Certificate);
            inputStream.close();
        } catch (error) {
            try {
                if (inputStream) {
                    inputStream.close();
                }
            } catch (e) {}
            console.error("nativescript-https > enableSSLPinning error", error);
            return;
        }
        peer.host = options.host;
        peer.commonName = options.commonName || options.host;
        peer.certificate = certificate;
        if (options.allowInvalidCertificates === true) {
            peer.allowInvalidCertificates = true;
        }
        if (options.validatesDomainName === false) {
            peer.validatesDomainName = false;
        }
    }
    peer.enabled = true;
    getClient(true);
}

export function disableSSLPinning() {
    peer.enabled = false;
    getClient(true);
}

let Client: okhttp3.OkHttpClient;
let cookieJar: com.nativescript.https.QuotePreservingCookieJar;
let cookieManager: java.net.CookieManager;
function getClient(
    reload: boolean = false,
    timeout: number = 10
): okhttp3.OkHttpClient {
    if (!Client) {
        // ssl error fix on KitKat. Only need to be done once.
        // client will be null only onced so will run only once
        const version = android.os.Build.VERSION.SDK_INT;
        if (version >= 16 && version < 22) {
            java.security.Security.insertProviderAt(
                (org as any).conscrypt.Conscrypt.newProvider(),
                1
            );
        }
    }
    // if (!Client) {
    // 	Client = new okhttp3.OkHttpClient()
    // }
    // if (Client) {
    // 	Client.connectionPool().evictAll()
    // 	Client = null
    // }
    if (Client && reload === false) {
        if (timeout === _timeout) {
            return Client;
        } else {
            return Client.newBuilder()
                .connectTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS)
                .build();
        }
    }
    if (!cookieJar) {
        cookieManager = new java.net.CookieManager();
        cookieManager.setCookiePolicy(java.net.CookiePolicy.ACCEPT_ALL);
        cookieJar = new com.nativescript.https.QuotePreservingCookieJar(
            cookieManager
        );
    }

    let client = new okhttp3.OkHttpClient.Builder();
    if (peer.enabled === true) {
        if (peer.host || peer.certificate) {
            let spec = okhttp3.ConnectionSpec.MODERN_TLS;
            client.connectionSpecs(java.util.Collections.singletonList(spec));

            let pinner = new okhttp3.CertificatePinner.Builder();
            pinner.add(peer.host, [peer.certificate]);
            client.certificatePinner(pinner.build());

            if (peer.allowInvalidCertificates === false) {
                try {
                    let x509Certificate = peer.x509Certificate;
                    let keyStore = java.security.KeyStore.getInstance(
                        java.security.KeyStore.getDefaultType()
                    );
                    keyStore.load(null, null);
                    // keyStore.setCertificateEntry(peer.host, x509Certificate)
                    keyStore.setCertificateEntry("CA", x509Certificate);

                    // let keyManagerFactory = javax.net.ssl.KeyManagerFactory.getInstance(
                    // 	javax.net.ssl.KeyManagerFactory.getDefaultAlgorithm()
                    // )
                    let keyManagerFactory = javax.net.ssl.KeyManagerFactory.getInstance(
                        "X509"
                    );
                    keyManagerFactory.init(keyStore, null);
                    let keyManagers = keyManagerFactory.getKeyManagers();

                    let trustManagerFactory = javax.net.ssl.TrustManagerFactory.getInstance(
                        javax.net.ssl.TrustManagerFactory.getDefaultAlgorithm()
                    );
                    trustManagerFactory.init(keyStore);

                    let sslContext = javax.net.ssl.SSLContext.getInstance(
                        "TLS"
                    );
                    sslContext.init(
                        keyManagers,
                        trustManagerFactory.getTrustManagers(),
                        new java.security.SecureRandom()
                    );
                    client.sslSocketFactory(sslContext.getSocketFactory());
                } catch (error) {
                    console.error(
                        "nativescript-https > client.allowInvalidCertificates error",
                        error
                    );
                }
            }

            if (peer.validatesDomainName === true) {
                try {
                    client.hostnameVerifier(
                        new javax.net.ssl.HostnameVerifier({
                            verify: (
                                hostname: string,
                                session: javax.net.ssl.SSLSession
                            ): boolean => {
                                let pp = session.getPeerPrincipal().getName();
                                let hv = javax.net.ssl.HttpsURLConnection.getDefaultHostnameVerifier();
                                if (
                                    peer.commonName &&
                                    peer.commonName[0] === "*"
                                ) {
                                    return (
                                        hv.verify(peer.host, session) &&
                                        hostname.indexOf(peer.host) > -1 &&
                                        hostname.indexOf(
                                            session.getPeerHost()
                                        ) > -1 &&
                                        pp.indexOf(peer.commonName) !== -1
                                    );
                                } else {
                                    return (
                                        hv.verify(peer.host, session) &&
                                        peer.host === hostname &&
                                        peer.host === session.getPeerHost() &&
                                        pp.indexOf(peer.host) !== -1
                                    );
                                }
                            },
                        })
                    );
                } catch (error) {
                    console.error(
                        "nativescript-https > client.validatesDomainName error",
                        error
                    );
                }
            }
        } else {
            console.warn(
                "nativescript-https > Undefined host or certificate. SSL pinning NOT working!!!"
            );
        }
    }

    _timeout = timeout;
    client
        .connectTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(timeout, java.util.concurrent.TimeUnit.SECONDS);

    if (cache) {
        client.cache(cache);
    }
    if (cookieJar) {
        client.cookieJar(cookieJar);
    }

    Client = client.build();
    return Client;
}

function cancelRequest(tag: string, client: okhttp3.OkHttpClient) {
    if (notClosedResponses[tag]) {
        notClosedResponses[tag].cancel();
        return;
    }
    const dispatcher = client.dispatcher();
    //When you want to cancel:
    //A) go through the queued calls and cancel if the tag matches:
    if (dispatcher.queuedCallsCount() > 0) {
        const queuedCalls = dispatcher.queuedCalls();
        for (let index = 0; index < queuedCalls.size(); index++) {
            const call = queuedCalls.get(index);
            if (call.request().tag() === tag) {
                call.cancel();
                return;
            }
        }
    }

    //B) go through the running calls and cancel if the tag matches:
    if (dispatcher.runningCallsCount() > 0) {
        const runningCalls = dispatcher.runningCalls();
        for (let index = 0; index < runningCalls.size(); index++) {
            const call = runningCalls.get(index);
            if (call.request().tag() === tag) {
                call.cancel();
                return;
            }
        }
    }
}

let CALL_ID = 0;
let notClosedResponses: {
    [k: string]: com.nativescript.https.OkHttpResponse;
} = {};
let OkHttpResponse: typeof com.nativescript.https.OkHttpResponse;
export function createRequest(
    opts: Https.HttpsRequestOptions
): Https.HttpsRequest {
    let client = getClient(false);

    let request = new okhttp3.Request.Builder();
    request.url(opts.url);

    if (opts.headers) {
        Object.keys(opts.headers).forEach((key) =>
            request.addHeader(key, opts.headers[key] as any)
        );
    }

    if (opts.cachePolicy) {
        let cacheControlBuilder = new okhttp3.CacheControl.Builder();
        switch (opts.cachePolicy) {
            case "noCache":
                cacheControlBuilder = cacheControlBuilder.noStore();
                break;
            case "onlyCache":
                cacheControlBuilder = cacheControlBuilder.onlyIfCached();
                break;
            case "ignoreCache":
                cacheControlBuilder = cacheControlBuilder.noCache();
                break;
        }
        request.cacheControl(cacheControlBuilder.build());
    }

    const methods = {
        GET: "get",
        HEAD: "head",
        DELETE: "delete",
        POST: "post",
        PUT: "put",
        PATCH: "patch",
    };
    let type;
    if (
        ["GET", "HEAD"].indexOf(opts.method) !== -1 ||
        (opts.method === "DELETE" &&
            !Utils.isDefined(opts.body) &&
            !Utils.isDefined(opts.content))
    ) {
        request[methods[opts.method]]();
    } else {
        type =
            opts.headers && opts.headers["Content-Type"]
                ? <string>opts.headers["Content-Type"]
                : "application/json";
        const MEDIA_TYPE = okhttp3.MediaType.parse(type);
        let okHttpBody: okhttp3.RequestBody;
        if (type.startsWith("multipart/form-data")) {
            let builder = new okhttp3.MultipartBody.Builder();
            builder.setType(MEDIA_TYPE);

            (opts.body as Https.HttpsFormDataParam[]).forEach((param) => {
                if (param.fileName && param.contentType) {
                    const MEDIA_TYPE = okhttp3.MediaType.parse(
                        param.contentType
                    );
                    builder.addFormDataPart(
                        param.parameterName,
                        param.fileName,
                        okhttp3.RequestBody.create(MEDIA_TYPE, param.data)
                    );
                } else {
                    builder.addFormDataPart(param.parameterName, param.data);
                }
            });
            okHttpBody = builder.build();
        } else {
            let body;
            if (opts.body) {
                try {
                    body = JSON.stringify(opts.body);
                } catch (ignore) {}
            } else if (opts.content) {
                body = opts.content;
            }
            okHttpBody = okhttp3.RequestBody.create(
                okhttp3.MediaType.parse(type),
                body
            );
        }
        request[methods[opts.method]](okHttpBody);
    }
    const tag = `okhttp_request_${CALL_ID++}`;
    const call = client.newCall(request.tag(tag).build());

    // We have to allow networking on the main thread because larger responses will crash the app with an NetworkOnMainThreadException.
    // Note that it would probably be better to offload it to a Worker or (natively running) AsyncTask.
    // Also note that once set, this policy remains active until the app is killed.
    if (opts.useLegacy === false && opts.allowLargeResponse) {
        android.os.StrictMode.setThreadPolicy(
            android.os.StrictMode.ThreadPolicy.LAX
        );
    }
    return {
        nativeRequest: call,
        cancel: () => cancelRequest(tag, client),
        run(resolve, reject) {
            call.enqueue(
                new okhttp3.Callback({
                    onResponse(call, response) {
                        const responseBody = response.body();
                        const message = response.message();
                        const statusCode = response.code();
                        const getHeaders = function () {
                            const heads = response.headers();
                            let headers = {};
                            // let heads: okhttp3.Headers = resp.headers();
                            let i: number,
                                len: number = heads.size();
                            for (i = 0; i < len; i++) {
                                let key = heads.name(i);
                                headers[key] = heads.value(i);
                            }
                            return headers;
                        };
                        if (opts.useLegacy) {
                            if (!OkHttpResponse) {
                                OkHttpResponse =
                                    com.nativescript.https.OkHttpResponse;
                            }

                            const nResponse = new OkHttpResponse(responseBody);

                            if (opts.onProgress) {
                                nResponse.progressCallback = new OkHttpResponse.OkHttpResponseProgressCallback(
                                    {
                                        onProgress: opts.onProgress,
                                    }
                                );
                            }

                            resolve({
                                response,
                                content: new HttpsResponse(
                                    nResponse,
                                    tag,
                                    opts.url
                                ),
                                statusCode,
                                reason: message,
                                get headers() {
                                    return getHeaders();
                                },
                            });
                        } else {
                            resolve({
                                response: response,
                                content: JSON.parse(responseBody.string()),
                                reason: message,
                                statusCode,
                                get headers() {
                                    return getHeaders();
                                },
                            });
                        }
                    },
                    onFailure(task, error) {
                        reject(error);
                    },
                })
            );
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
