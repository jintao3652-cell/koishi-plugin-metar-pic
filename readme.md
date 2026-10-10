# koishi-plugin-metar-pic

[![npm](https://img.shields.io/npm/v/koishi-plugin-metar-pic?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-metar-pic)

在 Koishi 中查询机场 METAR/TAF，并输出文字或图片（罗盘/风速表/云层剖面/跑道顶顺风等可视化）。

> 说明：本包名为 `koishi-plugin-metar-pic`，代码内插件 `name` 当前为 `metar-weather`（Koishi 加载插件时通常以包名为主）。

## 功能

- 指令查询：输入 ICAO（4 位）获取 METAR（部分数据源可返回 TAF）
- 输出模式：文本 / 图片 / 文本+图片
- 图片内容（现代化布局）
  - 风向罗盘、风速表盘指针
  - 跑道顶风/侧风分量表格（顶风端高亮、顺风端置灰）
  - 云层剖面（按云量/高度使用 `cloud.svg` 渲染）
  - 原始 METAR/TAF 报文
- 多数据源：支持 `xflysim` / `etops` / `xbzglw` / `aviationweather` / `metar-taf` / `nmc` / `china-airport` / `hko` / `smg` / `vatsim-radar`，多源并行取最新报文，可配置首选数据源
- 映射表：天气现象与云量代码可自定义中文描述

## 安装

在 Koishi 项目根目录安装：

```bash
npm i koishi-plugin-metar-pic
```

或：

```bash
pnpm add koishi-plugin-metar-pic
```

或：

```bash
yarn add koishi-plugin-metar-pic
```

## 依赖

### 文本模式

- 只要 Koishi 能联网即可。

### 图片模式

- 需要启用 `koishi-plugin-puppeteer`（本插件在 `inject = ['puppeteer']`）。
- 若未安装/未启用 puppeteer，图片输出会自动回退成文本输出，并提示缺少依赖。

## 使用

默认指令：

- 指令名：`metar`
- 别名：`气象`

示例：

```text
metar ZBAA
气象 ZSPD
```

注意：

- 仅接受 4 位 ICAO 码（会自动转大写），例如：`ZBAA`、`EHLE`

## 配置项

以下配置项均可在 Koishi 控制台插件配置中修改（以代码中 `Config`/`Schema` 为准）。

### 基础设置

| 字段 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `commandname` | string | `metar` | 注册的指令名称 |
| `commandalias` | string | `气象` | 指令别名 |

### 输出设置

| 字段 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `outputMode` | `text \| image \| both` | `text` | 输出模式（文本/图片/两者） |

### 渲染设置（图片）

| 字段 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `imageMode` | `auto \| manual` | `auto` | 自动裁剪 / 手动指定渲染尺寸 |
| `screenshotquality` | number | `80` | 图片质量（30-100） |
| `imageWidth` | number | `1600` | 手动模式宽度 |
| `imageHeight` | number | `900` | 手动模式高度 |
| `pageautoclose` | boolean | `true` | 图片生成后是否自动关闭 page |

### 数据源设置

| 字段 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `primarySource` | `xflysim \| etops \| xbzglw \| aviationweather \| metar-taf \| nmc \| china-airport \| hko \| smg \| vatsim-radar` | `xflysim` | 首选气象数据源（多个源并行查询，取报文时间最新的一个；时间相同时优先取此源） |

数据源大致差异（以实际接口返回为准）：

- `xflysim`：支持 METAR，TAF 通过 forecast 接口获取
- `etops`：支持 METAR/TAF（分接口）
- `xbzglw`：按文本行解析 METAR/TAF（可用性依赖站点）
- `vatsim-radar`：同一接口同时返回 METAR 与 TAF（见下节）

### VATSIM-Radar 设置

数据来自 `https://vatsim-radar.com/api/data/vatsim/airport/{icao}/metar`，**同一个响应里同时包含 METAR 和 TAF**。

该站整站套了 Cloudflare 人机验证，普通 HTTP 客户端直连大概率返回 403，因此抓取策略是：

1. 先尝试直连（若你的出口 IP 未被 Cloudflare 挑战，则直接成功，开销最小）；
2. 直连失败时用无头浏览器抓取，复用 Koishi 的 `puppeteer` 服务穿透人机验证。

| 字段 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `enableVatsimRadar` | boolean | `true` | 是否启用该数据源（需 `koishi-plugin-puppeteer` 已启用） |
| `vatsimRadarUserAgent` | string | 空 | 抓取时使用的 UA；留空则由浏览器自身 UA 派生（去掉 `Headless` 标记） |

说明：

- 该源是"多源并行 + 取最新"链路里的一员，不会因为你没选它作为 `primarySource` 就完全不请求——把 `enableVatsimRadar` 关掉才会跳过。
- 报文半小时更新一次，插件对该源做了 **2 分钟缓存**，避免每次查询都开一次浏览器；失败结果不缓存。
- 无头浏览器首次抓取约需 1.5 秒左右（挑战通过后同一浏览器实例会复用 `cf_clearance`）。

### API 设置（日出日落）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `apihub_token` | string | 是 | 用于请求日出日落时间（APIHUB Token） |

如果你不需要日出日落，也需要填写该字段（否则会请求失败并在日志里打印错误）。

### 映射表设置（可选）

你可以自定义如下映射表，以适配你所在地区的中文习惯：

- `weatherMap`：天气现象代码 -> 中文描述（如 `RA`、`TS`、`BR`、`-`、`+` 等）
- `cloudCoverageMap`：云量代码 -> 中文描述（如 `FEW`、`SCT`、`BKN`、`OVC`、`VV`、`NSC`、`NCD` 等）

### 开发者选项

| 字段 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `consoleinfo` | boolean | `false` | 开启更多日志输出（便于排错） |

## 输出说明

### 文本输出

会包含：

- 机场名称/海拔（如能获取）
- 飞行规则（VFR/MVFR/IFR/LIFR）
- 温度/露点/相对湿度、能见度、风、阵风、气压
- 云层与天气现象（按映射表翻译）
- 原始 METAR/TAF 报文

### 图片输出

图片主要由 `src/` 下的 SVG 素材组成：

- `wind.svg`：罗盘底图
- `zhizhen.svg`：风向指示针
- `wind_kt.svg`：风速表盘
- `compass-wind-needle.svg`：风速指针
- `runway.svg`：跑道示意
- `cloud.svg`：云朵图标

## 常见问题（FAQ）

### 1) 图片模式提示缺少 puppeteer

启用 `koishi-plugin-puppeteer` 后再将本插件 `outputMode` 设为 `image` 或 `both`。

### 2) 获取不到 METAR / 数据源不稳定

在配置里切换 `primarySource`：

- `xflysim` / `etops` / `xbzglw` / `aviationweather` / `metar-taf` / `nmc` / `china-airport` / `hko` / `smg` / `vatsim-radar`

并可打开 `consoleinfo` 查看具体失败原因（超时/接口变更/网络问题等）。

### 3) VATSIM-Radar 抓取失败

该源需要 `koishi-plugin-puppeteer` 已启用；日志里会打印是直连失败还是浏览器抓取失败（如"Cloudflare 人机验证未通过（403）"）。若你的网络环境不适合无头浏览器抓取，把 `enableVatsimRadar` 关闭即可。

### 4) 云层剖面/天气中文不符合你的习惯

直接在配置里编辑 `weatherMap` 与 `cloudCoverageMap`。

## 开发说明（可选）

- 入口：`src/index.ts`
- 本目录 `tsconfig.json` 目前主要用于生成声明文件（`emitDeclarationOnly`），若你在 monorepo/Koishi 工程中开发，实际 JS 构建方式以你的工程工具链为准。

