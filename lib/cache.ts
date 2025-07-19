// Simple in-memory cache for admin API responses
interface CacheItem {
    data: any
    timestamp: number
}

class AdminCache {
    private cache: Map<string, CacheItem> = new Map()
    private ttl: number = 2 * 60 * 1000 // 2 minutes for admin (shorter for freshness)

    set(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        })
    }

    get(key: string): any | null {
        const item = this.cache.get(key)
        if (!item) return null

        // Check if expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key)
            return null
        }

        return item.data
    }

    clear(): void {
        this.cache.clear()
    }

    // Clear expired items
    cleanup(): void {
        const now = Date.now()
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key)
            }
        }
    }
}

export const adminCache = new AdminCache()

// Cleanup expired cache items every 2 minutes
if (typeof window !== "undefined") {
    setInterval(() => {
        adminCache.cleanup()
    }, 2 * 60 * 1000)
}
