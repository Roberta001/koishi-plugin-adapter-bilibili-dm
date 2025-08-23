# 快速开始

## 安装插件

### 通过 Koishi 控制台安装（通用）

1. 打开 Koishi 控制台
2. 进入插件市场
3. 搜索 
```bash
adapter-bilibili-dm
```
4. 点击安装

<img src="https://i0.hdslb.com/bfs/openplatform/ccf09979c5dc0174a462f38dc900cd87c91f925b.png" alt="market" referrerpolicy="no-referrer" width="500">

### 通过命令行安装（项目模板）

```bash
yarn add koishi-plugin-adapter-bilibili-dm
```

## 基础配置

### 1. 获取 Bilibili UID

在配置插件之前，您需要获取您的 Bilibili 账号 UID。

#### 手机端获取方法

<img src="https://i0.hdslb.com/bfs/openplatform/9168ed872d8d132ee32d265b17327bbda5d40588.png" alt="手机端获取方法" referrerpolicy="no-referrer" width="500">

#### WEB端获取方法

<img src="https://i0.hdslb.com/bfs/openplatform/44f38e9a76c90cc6ceba563931ea5fe67a034dca.png" alt="WEB端获取方法" referrerpolicy="no-referrer" width="500">

### 2. 配置插件

1. 在 Koishi 控制台中找到 `adapter-bilibili-dm` 插件
2. 填入获取到的 UID
3. 启用插件

### 3. 登录认证

插件启用后，需要进行登录认证：

1. 在插件配置页面会显示二维码
2. 使用 Bilibili APP 扫描二维码
3. 确认登录

<img src="https://i0.hdslb.com/bfs/openplatform/d3f604c1b732ff83f0874ee89027dda8e4c3031a.png" alt="登录认证" referrerpolicy="no-referrer" width="500">


## 验证安装

配置完成后，你可以：

1. 在 Koishi 控制台查看适配器状态
2. 尝试发送一条测试私信（例如`help`、`inspect`）
3. 检查是否能正常接收、回应私信
