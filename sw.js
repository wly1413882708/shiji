// 离线缓存：装到桌面之后，断网也能打开。
// 改版时把 CACHE 的版本号 +1，旧的缓存会在 activate 里清掉。
const CACHE = 'shiji-v1'
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 打开页面：先联网拿最新的，失败就用缓存里的那一份
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('./', copy))
          return res
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
    )
    return
  }

  // 其余的静态文件：有缓存就直接给，顺手补一份新的
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
        }
        return res
      })
    })
  )
})
