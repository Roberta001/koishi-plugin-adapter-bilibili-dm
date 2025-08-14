# 开发指南

## 环境准备

### 系统要求

- Node.js >= 22.0.0
- Yarn 或 npm
- Git

### 开发环境搭建

1. **创建 Koishi 项目模板**

```bash
yarn create koishi
```

一路回车，直到弹出 Koishi 的 WebUI。

2. **进入项目目录**

先在 Koishi 终端按下 `Ctrl + C` 退出项目模板，然后进入目录：

```bash
cd koishi-app
```

3. **克隆本仓库**

```bash
yarn clone Roberta001/koishi-plugin-adapter-bilibili-dm
```

4. **以开发模式启动**

```bash
yarn dev
```

