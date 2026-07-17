const isStringKeyRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const stableSerializeValue = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerializeValue(entry)).join(",")}]`;
  }

  if (isStringKeyRecord(value)) {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableSerializeValue(value[key])}`);
    return `{${entries.join(",")}}`;
  }

  throw new Error(`无法序列化 Hash 输入类型：${typeof value}`);
};

export const stableSerialize = (value: unknown): string => stableSerializeValue(value);

export const sha256Hex = async (value: string): Promise<string> => {
  try {
    if (globalThis.crypto?.subtle === undefined) {
      throw new Error("当前运行环境不支持 Web Crypto SHA-256。 ");
    }

    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 SHA-256 错误";
    throw new Error(`生成内容 Hash 失败：${message}`);
  }
};

export const sha256ArrayBuffer = async (value: ArrayBuffer): Promise<string> => {
  try {
    if (globalThis.crypto?.subtle === undefined) {
      throw new Error("当前运行环境不支持 Web Crypto SHA-256。");
    }

    const digest = await globalThis.crypto.subtle.digest("SHA-256", value);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 SHA-256 错误";
    throw new Error(`生成二进制内容 Hash 失败：${message}`);
  }
};
