import { URL } from "url";
import { Logger } from "../logger";

/**
 * 安全的URL处理工具类
 */
export class SecureUrlHandler {
    // 允许的协议列表
    private static readonly ALLOWED_PROTOCOLS = ["http:", "https:"];
    
    // 允许的域名列表（可选，用于限制访问的域名）
    private static readonly ALLOWED_DOMAINS = [
        "example.com", // 示例域名，实际使用时应该配置为允许的域名
        "trusted-cdn.com"
    ];
    
    // 危险的URL模式
    private static readonly DANGEROUS_PATTERNS = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /ftp:/i,
        /@/, // 防止凭证注入
        /localhost/i,
        /127\.0\.0\.1/,
        /0x7f000001/, // 127.0.0.1 的十六进制表示
        /0177\.0\.0\.1/, // 127.0.0.1 的八进制表示
        /2130706433/, // 127.0.0.1 的十进制表示
        /::1/, // IPv6 localhost
        /0:0:0:0:0:0:0:1/ // IPv6 localhost 完整形式
    ];

    /**
     * 清理和验证URL
     * @param rawUrl 原始URL字符串
     * @param requestId 请求ID，用于日志追踪
     * @returns 清理后的安全URL
     * @throws Error 如果URL不安全或格式无效
     */
    static sanitizeAndValidateUrl(rawUrl: string, requestId?: string): string {
        if (!rawUrl || typeof rawUrl !== "string") {
            const error = new Error("URL必须是非空字符串");
            error.name = "InvalidUrlError";
            throw error;
        }

        // 去除前后空格
        const trimmedUrl = rawUrl.trim();
        
        if (trimmedUrl.length === 0) {
            const error = new Error("URL不能为空");
            error.name = "InvalidUrlError";
            throw error;
        }

        // 检查URL长度
        if (trimmedUrl.length > 2048) {
            const error = new Error("URL长度不能超过2048个字符");
            error.name = "InvalidUrlError";
            throw error;
        }

        // 检查危险模式
        for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(trimmedUrl)) {
                Logger.warn("SecureUrlHandler", "sanitizeAndValidateUrl", "检测到危险的URL模式", {
                    url: trimmedUrl.substring(0, 50) + "...",
                    pattern: pattern.toString(),
                    requestId,
                });

                const error = new Error("URL包含不安全的内容");
                error.name = "UnsafeUrlError";
                throw error;
            }
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(trimmedUrl);
        } catch (urlError) {
            Logger.warn("SecureUrlHandler", "sanitizeAndValidateUrl", "无效的URL格式", {
                url: trimmedUrl.substring(0, 50) + "...",
                error: urlError instanceof Error ? urlError.message : "Unknown error",
                requestId,
            });

            const error = new Error("URL格式无效");
            error.name = "InvalidUrlError";
            throw error;
        }

        // 验证协议
        if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
            Logger.warn("SecureUrlHandler", "sanitizeAndValidateUrl", "不允许的URL协议", {
                protocol: parsedUrl.protocol,
                url: trimmedUrl.substring(0, 50) + "...",
                requestId,
            });

            const error = new Error(`不允许的协议: ${parsedUrl.protocol}`);
            error.name = "UnsafeProtocolError";
            throw error;
        }

        // 验证主机名（防止SSRF攻击）
        if (!this.isHostnameSafe(parsedUrl.hostname)) {
            Logger.warn("SecureUrlHandler", "sanitizeAndValidateUrl", "不安全的主机名", {
                hostname: parsedUrl.hostname,
                url: trimmedUrl.substring(0, 50) + "...",
                requestId,
            });

            const error = new Error("不允许访问该主机");
            error.name = "UnsafeHostnameError";
            throw error;
        }

        // 验证端口（防止访问内网端口）
        if (!this.isPortSafe(parsedUrl.port, parsedUrl.protocol)) {
            Logger.warn("SecureUrlHandler", "sanitizeAndValidateUrl", "不安全的端口", {
                port: parsedUrl.port,
                protocol: parsedUrl.protocol,
                url: trimmedUrl.substring(0, 50) + "...",
                requestId,
            });

            const error = new Error("不允许访问该端口");
            error.name = "UnsafePortError";
            throw error;
        }

        // 重新构建URL以确保所有组件都是安全的
        const safeUrl = this.rebuildSafeUrl(parsedUrl);
        
        Logger.info("SecureUrlHandler", "sanitizeAndValidateUrl", "URL验证通过", {
            originalUrl: trimmedUrl.substring(0, 50) + "...",
            safeUrl: safeUrl.substring(0, 50) + "...",
            requestId,
        });

        return safeUrl;
    }

    /**
     * 检查主机名是否安全
     * @param hostname 主机名
     * @returns 是否安全
     */
    private static isHostnameSafe(hostname?: string): boolean {
        if (!hostname) {
            return false;
        }

        // 检查是否为内网IP地址
        if (this.isPrivateIp(hostname)) {
            return false;
        }

        // 检查是否在允许的域名列表中（如果配置了域名白名单）
        if (this.ALLOWED_DOMAINS.length > 0) {
            return this.ALLOWED_DOMAINS.some(allowedDomain => 
                hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)
            );
        }

        // 如果没有配置域名白名单，则允许所有外部域名（除了内网IP）
        return true;
    }

    /**
     * 检查是否为私有IP地址
     * @param hostname 主机名
     * @returns 是否为私有IP
     */
    private static isPrivateIp(hostname: string): boolean {
        // 私有IP地址范围
        const privateIpRanges = [
            /^10\./,                    // 10.0.0.0/8
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
            /^192\.168\./,              // 192.168.0.0/16
            /^169\.254\./,              // 169.254.0.0/16 (链路本地)
            /^fc00:/,                   // fc00::/7 (IPv6 私有地址)
            /^fe80:/,                   // fe80::/10 (IPv6 链路本地)
            /^::1$/,                    // IPv6 localhost
            /^127\./,                   // 127.0.0.0/8 (localhost)
        ];

        return privateIpRanges.some(range => range.test(hostname));
    }

    /**
     * 检查端口是否安全
     * @param port 端口号
     * @param protocol 协议
     * @returns 是否安全
     */
    private static isPortSafe(port: string | null, protocol: string): boolean {
        // 如果没有指定端口，使用协议默认端口
        if (!port) {
            return true;
        }

        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            return false;
        }

        // 危险端口列表
        const dangerousPorts = [
            22,    // SSH
            23,    // Telnet
            25,    // SMTP
            53,    // DNS
            135,   // RPC
            139,   // NetBIOS
            445,   // SMB
            1433,  // SQL Server
            1521,  // Oracle
            2049,  // NFS
            3306,  // MySQL
            3389,  // RDP
            5432,  // PostgreSQL
            5984,  // CouchDB
            6379,  // Redis
            8080,  // 常见的内部服务端口
            9200,  // Elasticsearch
            27017, // MongoDB
        ];

        return !dangerousPorts.includes(portNum);
    }

    /**
     * 重新构建安全的URL
     * @param parsedUrl 解析后的URL对象
     * @returns 重新构建的安全URL
     */
    private static rebuildSafeUrl(parsedUrl: URL): string {
        // 创建新的URL对象，确保所有组件都是安全的
        const safeUrl = new URL(parsedUrl.protocol, parsedUrl.origin);
        
        // 设置主机名
        if (parsedUrl.hostname) {
            safeUrl.hostname = parsedUrl.hostname;
        }
        
        // 设置端口（如果不是默认端口）
        if (parsedUrl.port && !this.isDefaultPort(parsedUrl.port, parsedUrl.protocol)) {
            safeUrl.port = parsedUrl.port;
        }
        
        // 设置路径（清理路径中的危险字符）
        if (parsedUrl.pathname) {
            safeUrl.pathname = this.sanitizePath(parsedUrl.pathname);
        }
        
        // 设置查询参数（清理查询字符串中的危险字符）
        if (parsedUrl.search) {
            safeUrl.search = this.sanitizeQueryString(parsedUrl.search);
        }
        
        // 设置哈希（清理哈希中的危险字符）
        if (parsedUrl.hash) {
            safeUrl.hash = this.sanitizeHash(parsedUrl.hash);
        }
        
        return safeUrl.toString();
    }

    /**
     * 检查是否为默认端口
     * @param port 端口号
     * @param protocol 协议
     * @returns 是否为默认端口
     */
    private static isDefaultPort(port: string, protocol: string): boolean {
        const defaultPorts: { [key: string]: number } = {
            "http:": 80,
            "https:": 443,
        };
        
        return defaultPorts[protocol] === parseInt(port, 10);
    }

    /**
     * 清理路径中的危险字符
     * @param path 原始路径
     * @returns 清理后的路径
     */
    private static sanitizePath(path: string): string {
        // 移除路径遍历攻击字符
        return path.replace(/\.\./g, "").replace(/\/+/g, "/");
    }

    /**
     * 清理查询字符串中的危险字符
     * @param queryString 原始查询字符串
     * @returns 清理后的查询字符串
     */
    private static sanitizeQueryString(queryString: string): string {
        // 移除潜在的危险字符
        return queryString.replace(/[<>'"]/g, "");
    }

    /**
     * 清理哈希中的危险字符
     * @param hash 原始哈希
     * @returns 清理后的哈希
     */
    private static sanitizeHash(hash: string): string {
        // 移除潜在的危险字符
        return hash.replace(/[<>'"]/g, "");
    }
}