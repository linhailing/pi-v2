---
name: uniapp-dev
description: uniapp 跨端开发规范，处理 H5/小程序/App 条件编译、平台差异和常见踩坑
---

# uniapp 开发规范

## 条件编译
- 平台判断优先使用条件编译，而非运行时 `uni.getSystemInfoSync()`
- 示例：`// #ifdef MP-WEIXIN`

## 目录约定
- 页面放 `pages/`，组件放 `components/`，静态资源放 `static/`
- 小程序端注意 `static` 目录大小限制

## 常见差异
- H5 端可用 DOM API，小程序端不可用
- 小程序端 `v-html` 受限，需用 `rich-text`
- 检查 `manifest.json` 中各平台配置是否完整