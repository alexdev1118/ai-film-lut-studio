# 技术 LUT 处理链路

## 产品边界

AI Film LUT Studio 维持两种不同导出：

- `POST` 是 Rec.709 / 已还原素材使用的后期创意 LUT，不包含输入技术转换。
- `CAMMON_TEST` 是相机监看实验导出。只有用户主动导入本地 3D `.cube`，文件与所选机型、Gamma、Gamut 匹配，并通过结构校验后，技术转换阶段才会参与计算。

本项目不下载、分发或提交厂商 LUT 文件。厂商下载页只登记元数据；授权不明确时，用户必须自行从官方渠道下载并从本机导入。

## 固定处理顺序

相机监看 LUT 的重采样顺序固定为：

1. 输入技术转换：本地导入的 3D `.cube`。
2. 创意风格：工作台参数和参考图平均色。
3. 显示输出变换：当前试点通常由输入技术 LUT 的目标输出承担；独立显示 LUT 接口已预留。
4. 监看亮度：仅使用用户选择的显示亮度偏移。
5. Range：Full 或通用 Legal 映射。

代码不提供 `creative → technical` 的反向合成路径。社区曝光建议不会进入 RGB 计算，也不会写成官方 EV。

## 本地文件校验

导入流程依次执行：

1. 文件扩展名和 100MB 大小上限检查。
2. `cubeValidate` 基础格式校验。
3. `cubeParser` 严格解析 TITLE、LUT_3D_SIZE、DOMAIN、注释和 RGB 数据。
4. 仅接受 17、33、65 点 3D LUT；1D LUT 和其他点数会被拒绝。
5. 计算 SHA-256，并与登记的 `VendorLutAsset` 哈希比较。

只有官方元数据已核验、型号/Gamma/Gamut 匹配、点数匹配且 SHA-256 一致时，状态才是 `verified-official`。当前元数据没有登记文件哈希的资产会保持 `user-supplied-unverified`，即使用户从官方页面自行下载。

## 厂商试点边界

- Sony A6700 / FX3：允许导入用户自行取得的 S-Log3 技术 LUT；没有匹配哈希时保持 TEST。
- Panasonic S5 IIX：区分 V-Log 技术转换与机内 Real Time LUT 创意用途；本地文件没有哈希时保持 TEST。
- ARRI ALEXA 35：LogC4 / AWG4 与 LogC3 分开，界面选择不匹配时会解除已绑定文件。
- RED：RWG / Log3G10 的 IPP2 output transform 不是普通创意 LUT；当前解析器只接受 17、33、65 点，因此 32 点文件不会静默导入。

## 尚未实现

- 不含厂商 LUT 二进制文件，也不自动联网下载。
- 不执行官方 Log 公式、色彩矩阵、ACES 或 CST。
- 不将缺少哈希的文件标记为官方已验证。
- 不支持 1D LUT、32 点 LUT、`.vlt`、`.aml` 或压缩包直接解析。
- 不把社区曝光经验写入 LUT RGB 或元信息中的官方建议字段。
