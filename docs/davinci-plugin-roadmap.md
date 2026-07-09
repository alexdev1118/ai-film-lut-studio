# DaVinci Resolve 插件与本地桥接路线图

## 目标

AI Film LUT Studio 当前生成的是 Rec.709 / 标准显示空间下的基础创意风格 LUT，不是相机 Log 技术转换 LUT。DaVinci 方向的长期目标是：

- 在 DaVinci Resolve 中抓取当前时间线静帧。
- 将静帧发送到本工具或未来本地桥接服务。
- 使用网页工作台生成创意 LUT。
- 将 `.cube` 文件写入用户指定的 LUT 文件夹。
- 用户在调色节点中加载并微调 LUT。

## 三条技术路线

### 1. 纯网页手动路线

用户从 DaVinci 手动导出静帧，在网页工作台上传静帧和参考图，生成 `.cube` 后手动导入 DaVinci。这是当前最稳定路线。

浏览器内的视频抽帧只依赖本机浏览器解码能力，推荐 MP4 / H.264 / 8bit Rec.709 素材。MOV 内的 H.265 / HEVC、ProRes、10bit / 12bit、Log 高规格素材或相机原始素材可能无法预览。遇到这类素材时，推荐仍然走 DaVinci / Premiere / Final Cut Pro / 剪映专业版导出当前帧为 JPG、PNG 或 TIFF，再回到网页目标素材箱上传静帧。

### 2. 本地服务桥接路线

未来可以提供仅在用户本机运行的本地服务，负责接收静帧、读写工作台状态、保存 LUT 文件，并与网页端通过 localhost API 通信。

### 3. DaVinci Python / Lua 脚本路线

未来可以通过 DaVinci Resolve 脚本导出当前时间线帧，或者调用本地服务导入静帧。脚本能力取决于 DaVinci 版本、授权类型、系统路径和脚本 API 限制。

## MVP 分阶段

### 第一版

- 用户手动从 DaVinci 导出静帧。
- 网页生成基础创意 LUT。
- 用户手动导入 LUT。
- 如果浏览器无法解码 MOV、ProRes、10bit、Log 或相机原始视频，第一版仍以专业软件导出静帧为准。

### 第二版

- DaVinci 脚本导出当前帧。
- 自动打开网页工具或本地服务地址。
- 用户在网页中生成 LUT。

### 第三版

- 本地服务接收静帧。
- 本地生成或接收 LUT。
- 保存到 DaVinci LUT 目录。
- 用户在 DaVinci 中刷新 LUT 列表并加载。

## 风险

- DaVinci 脚本 API 对当前帧导出和路径访问存在版本差异。
- Windows / macOS / Linux 的脚本目录和 LUT 目录不同。
- LUT 文件夹可能需要用户权限确认。
- 自动刷新 DaVinci LUT 列表不可完全依赖脚本控制。
- DaVinci 项目色彩管理、CST、节点顺序会影响最终观感。
- Log / Rec.709 工作流差异会导致网页预览和软件效果不一致。

## React 项目需要预留的接口

- 导入目标静帧接口：接收一张本地静帧并加入目标素材箱。
- 导出 LUT 到指定路径接口：未来由本地服务执行文件写入。
- Workspace 状态 JSON：包含参数、输入配置、当前风格、LUT 精度等。
- LUT 元数据 JSON：包含文件名、行数、校验结果、输入假设和工作流提示。
- 本地服务 API 约定：参见 `tools/davinci-bridge/api-contract.md`。

## 当前状态

本仓库目前只提供路线图和桥接骨架。尚未实现 DaVinci 插件、DaVinci 自动导帧、本地服务、自动写入 LUT 文件夹或自动刷新 DaVinci LUT 列表。
