# 快速开始

## 安装插件

### 通过 Koishi 控制台安装

1. 打开 Koishi 控制台
2. 进入插件市场
3. 搜索 `adapter-bilibili-dm`
4. 点击安装

### 通过命令行安装

```bash
yarn add koishi-plugin-adapter-bilibili-dm
# 或
npm install koishi-plugin-adapter-bilibili-dm
```

## 基础配置

### 1. 获取 Bilibili UID

在配置插件之前，您需要获取您的 Bilibili 账号 UID。

#### 手机端获取方法

[->点击此处查看 手机端获取方法](https://i0.hdslb.com/bfs/openplatform/9168ed872d8d132ee32d265b17327bbda5d40588.png)

#### 电脑端获取方法

[->点击此处查看 电脑端获取方法](https://i0.hdslb.com/bfs/openplatform/b216ed9fd08585fd2b1b7e89cef06618e10553c2.png)

### 2. 配置插件

1. 在 Koishi 控制台中找到 `adapter-bilibili-dm` 插件
2. 填入获取到的 UID
3. 启用插件

### 3. 登录认证

插件启用后，需要进行登录认证：

1. 在插件配置页面会显示二维码
2. 使用 Bilibili APP 扫描二维码
3. 确认登录

[->点击此处查看 登录认证](https://i0.hdslb.com/bfs/openplatform/d3f604c1b732ff83f0874ee89027dda8e4c3031a.png)


## 验证安装

配置完成后，你可以：

1. 在 Koishi 控制台查看适配器状态
2. 尝试发送一条测试私信（例如help、inspect）
3. 检查是否能正常接收、回应私信
