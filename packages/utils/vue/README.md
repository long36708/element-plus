## 什么场景使用这个函数

withNoopInstall 函数主要用于 Vue 组件的封装和分发，特别是在构建 UI 组件库时。

具体使用场景如下：

- 组件库开发：当开发者创建一个 Vue 组件库（如 Element Plus）时，某些组件可能不需要或暂时不需要 install 方法来全局注册。
  - 通过withNoopInstall，可以为这些组件添加一个空操作的 install 方法，确保它们在全局注册时不会抛出错误。
- 按需引入：对于支持按需引入的组件库，install 方法并不是必须的。
  - 使用 withNoopInstall 可以确保即使用户尝试全局引入组件时，也不会因为缺少install 方法而报错。
- 兼容性处理：某些情况下，组件库需要保持向后兼容性。
  - 即使新版本的组件不再依赖 install 方法，为了兼容旧版本的代码，可以通过withNoopInstall 提供一个空实现。
