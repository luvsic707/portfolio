# 上线手册

原则：**先部署到临时地址，最后一步才切域名。**
在你点头之前，`redthreadcreative.me` 上的旧站一直活着。

---

## 现状（2026-08-27 实测）

| 项目 | 情况 |
|---|---|
| 注册商 | eNom（Cargo 的域名渠道商） |
| DNS | `ns1.cargo.site` / `ns2.cargo.site` |
| 当前指向 | `3.234.189.133` / `3.215.100.79`（Cargo 的服务器） |
| 注册日 | 2025-11-14 |
| **到期日** | **2026-11-14** |
| 转移锁 | 开着（默认状态，转出前要解锁） |

### ⚠️ 动手之前先确认这一件事

登录 Cargo 后台，看 **域名的续费是不是绑在 Cargo 订阅上**。

如果是，**退订 Cargo 可能连域名一起丢**。这是整个迁移里唯一真正的风险。
确认清楚之前，不要退订 Cargo。

---

## 第 1 步：推到 GitHub

先在 github.com 建一个仓库（**建成 Private 也可以**，Vercel 照样能连）。
建的时候不要勾 README / .gitignore，要一个完全空的仓库。

然后在本地：

```bash
cd ~/projects/portfolio
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

如果提示要密码，GitHub 现在不收账户密码，要用 Personal Access Token，
或者装 GitHub Desktop 用图形界面推。

---

## 第 2 步：部署到 Vercel（拿临时地址）

1. 用 GitHub 账号登录 [vercel.com](https://vercel.com)
2. **Add New → Project**，选刚才那个仓库
3. 它会自动认出这是 Astro 项目，**所有设置保持默认，直接 Deploy**
   - Framework Preset: Astro
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 一两分钟后拿到一个 `xxx.vercel.app` 的地址

**从这一刻起，每次 `git push`，Vercel 会自动重新部署。**

---

## 第 3 步：在临时地址上把内容填完

这一步可以待几天几周，不着急。旧站还在正常跑。

- 图片放进各项目文件夹
- 补另外两个新项目
- 页脚的邮箱和社交链接换成真的（`src/components/Footer.astro`）

改完本地跑 `npm run build` 确认能过，再 `git push`。

---

## 第 4 步：切域名（旧站在这一步下线）

### 4a. 在 Vercel 里加域名

Project → **Settings → Domains** → 填 `redthreadcreative.me`。
Vercel 会给你要填的 DNS 记录，照抄。通常是：

```
类型    名称    值
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

> 以 Vercel 界面上实际显示的为准，别照抄这里的数字。

### 4b. 去改 DNS

**如果域名还在 Cargo**：在 Cargo 后台找 DNS / Domain 设置，把 A 记录从
`3.234.189.133` 改成 Vercel 给的地址。

**如果 Cargo 不让改自定义记录**（有可能），那就得先做下面的「转出域名」。

### 4c. 等生效

DNS 传播一般几分钟到几小时。Vercel 会自动签发 HTTPS 证书。
`https://redthreadcreative.me` 能打开、锁图标正常，就完成了。

---

## 可选但推荐：把域名转出来

**为什么**：域名 2026-11-14 到期，而 `.me` 转移会**自动加一年**（到 2027-11-14）。
等于转出的同时把续费办了，还不用付 Cargo 的溢价。而且以后不受 Cargo 牵制。

**推荐去处**：Cloudflare Registrar（按成本价，无加价）或 Porkbun。

**步骤**：

1. Cargo 后台：关闭转移锁（Transfer Lock / clientTransferProhibited）
2. 索取 **EPP 码**（也叫 Auth Code / 授权码）
3. 到新注册商发起「转入域名」，填域名 + EPP 码，付一年费用
4. 邮箱会收到确认信，点确认
5. **等 5–7 天**

**注意**：别拖到临近 11 月 14 号才做，转移期间遇上到期会很麻烦。

---

## 日常更新

内容改完之后：

```bash
cd ~/projects/portfolio
npm run build          # 先确认能构建通过
git add -A
git commit -m "加了新作品"
git push
```

推上去 1–2 分钟后线上自动更新。

---

## 出问题时

| 症状 | 原因 |
|---|---|
| Vercel 构建失败 | 多半是 md 里引用了不存在的图片。看构建日志里的 `ImageNotFound`，把路径改对或先把图放进去 |
| 域名打不开但 vercel.app 正常 | DNS 还没生效，或记录填错。用 `dig +short redthreadcreative.me` 看当前指向 |
| 页面能开但样式全丢 | 检查 `astro.config.mjs` 里的 `site` 是不是写对了域名 |
| 换了域名 | 改 `astro.config.mjs` 的 `site`，以及 `public/robots.txt` 里的 sitemap 地址 |

---

## 已验证

生产构建在真实静态服务器上跑过（不是开发服务器）：

- 13 个页面全部 200
- 404 页正常返回
- 没有写死的 localhost 路径
- sitemap 和 canonical 域名正确
- 产物 228KB
