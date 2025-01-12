import { computed, getCurrentInstance, inject, ref, unref } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export const defaultNamespace = 'el'
const statePrefix = 'is-'

/**
 * 生成基于BEM（Block Element Modifier）命名约定的CSS类名
 *
 * @param namespace 命名空间，通常用于标识项目或库，确保类名不冲突
 * @param block 块名，代表一个独立的功能模块
 * @param blockSuffix 块后缀，用于表示块的变体或状态
 * @param element 元素名，代表块内的一个组成部分
 * @param modifier 修饰符，用于描述元素或块的某一状态或样式变体
 * @returns 返回根据BEM命名约定生成的CSS类名字符串
 *
 * 此函数根据传入的参数，构建出符合BEM命名规则的CSS类名，以支持模块化和可维护的CSS结构
 */
const _bem = (
  namespace: string,
  block: string,
  blockSuffix: string,
  element: string,
  modifier: string
) => {
  // 初始化类名，组合命名空间和块名
  let cls = `${namespace}-${block}`

  // 如果提供了块后缀，则将其加入类名中
  if (blockSuffix) {
    cls += `-${blockSuffix}`
  }

  // 如果提供了元素名，则将其加入类名中
  if (element) {
    cls += `__${element}`
  }

  // 如果提供了修饰符，则将其加入类名中
  if (modifier) {
    cls += `--${modifier}`
  }

  // 返回最终构建的CSS类名
  return cls
}

/**
 * 定义一个注入键，用于在提供者和消费者之间传递命名空间的引用。
 * 使用InjectionKey类型来确保类型安全和避免键名冲突。
 * 该键关联的值是一个Ref，它是一个响应式的引用，可以用来追踪命名空间的变化。
 * 命名空间的值可以是字符串，也可以是undefined，以支持不同的使用场景。
 *
 * @type {InjectionKey<Ref<string | undefined>>} 一个唯一的注入键，用于传递命名空间的响应式引用。
 */
export const namespaceContextKey: InjectionKey<Ref<string | undefined>> =
  Symbol('namespaceContextKey')

/**
 * 自定义命名空间钩子
 * 该钩子用于确定组件应使用的最终命名空间它首先检查是否有通过 props 传递的命名空间覆盖值
 * 如果没有提供覆盖值，它会尝试从当前组件实例中注入命名空间上下文
 * 如果无法注入，则使用默认命名空间
 *
 * @param namespaceOverrides 可选的 Ref<string | undefined> 类型的命名空间覆盖值，通过 props 传递
 * @returns 返回一个计算属性，该属性提供了最终确定的命名空间
 */
export const useGetDerivedNamespace = (
  namespaceOverrides?: Ref<string | undefined>
) => {
  // 确定使用的命名空间：如果有覆盖值，则使用覆盖值，否则尝试从上下文中注入或使用默认命名空间
  const derivedNamespace =
    namespaceOverrides ||
    (getCurrentInstance()
      ? inject(namespaceContextKey, ref(defaultNamespace))
      : ref(defaultNamespace))

  // 计算最终的命名空间值，确保命名空间始终有值
  const namespace = computed(() => {
    return unref(derivedNamespace) || defaultNamespace
  })

  // 返回计算得到的命名空间
  return namespace
}

/**
 * 自定义命名空间钩子
 * 用于生成基于命名空间的BEM样式类名和CSS变量
 *
 * @param block 组件名称，用于生成BEM样式的基础块名
 * @param namespaceOverrides 可选的命名空间覆盖值，用于在不同情况下重写默认命名空间
 * @returns 返回一个对象，包含生成的BEM样式类名和CSS变量的方法
 */
export const useNamespace = (
  block: string,
  namespaceOverrides?: Ref<string | undefined>
) => {
  // 获取衍生的命名空间
  const namespace = useGetDerivedNamespace(namespaceOverrides)

  /**
   * 生成块样式类名
   * @param blockSuffix 可选的块后缀
   * @returns 返回块样式类名
   */
  const b = (blockSuffix = '') =>
    _bem(namespace.value, block, blockSuffix, '', '')

  /**
   * 生成元素样式类名
   * @param element 元素名称
   * @returns 如果提供了元素名称，则返回元素样式类名；否则返回空字符串
   */
  const e = (element?: string) =>
    element ? _bem(namespace.value, block, '', element, '') : ''

  /**
   * 生成修饰符样式类名
   * @param modifier 修饰符名称
   * @returns 如果提供了修饰符名称，则返回修饰符样式类名；否则返回空字符串
   */
  const m = (modifier?: string) =>
    modifier ? _bem(namespace.value, block, '', '', modifier) : ''

  /**
   * 生成块后缀和元素组合的样式类名
   * @param blockSuffix 块后缀
   * @param element 元素名称
   * @returns 如果提供了块后缀和元素名称，则返回组合的样式类名；否则返回空字符串
   */
  const be = (blockSuffix?: string, element?: string) =>
    blockSuffix && element
      ? _bem(namespace.value, block, blockSuffix, element, '')
      : ''

  /**
   * 生成元素和修饰符组合的样式类名
   * @param element 元素名称
   * @param modifier 修饰符名称
   * @returns 如果提供了元素和修饰符名称，则返回组合的样式类名；否则返回空字符串
   */
  const em = (element?: string, modifier?: string) =>
    element && modifier
      ? _bem(namespace.value, block, '', element, modifier)
      : ''

  /**
   * 生成块后缀和修饰符组合的样式类名
   * @param blockSuffix 块后缀
   * @param modifier 修饰符名称
   * @returns 如果提供了块后缀和修饰符名称，则返回组合的样式类名；否则返回空字符串
   */
  const bm = (blockSuffix?: string, modifier?: string) =>
    blockSuffix && modifier
      ? _bem(namespace.value, block, blockSuffix, '', modifier)
      : ''

  /**
   * 生成包含块后缀、元素和修饰符的完整BEM样式类名
   * @param blockSuffix 块后缀
   * @param element 元素名称
   * @param modifier 修饰符名称
   * @returns 如果提供了所有参数，则返回完整的BEM样式类名；否则返回空字符串
   */
  const bem = (blockSuffix?: string, element?: string, modifier?: string) =>
    blockSuffix && element && modifier
      ? _bem(namespace.value, block, blockSuffix, element, modifier)
      : ''

  /**
   * 生成状态类名
   * 可以接受一个名称和一个可选的状态值，如果状态值为true，则返回带有状态前缀的名称
   * @param name 名称
   * @param state 状态值
   * @returns 返回状态类名或空字符串
   */
  const is: {
    (name: string, state: boolean | undefined): string
    (name: string): string
  } = (name: string, ...args: [boolean | undefined] | []) => {
    const state = args.length >= 1 ? args[0]! : true
    return name && state ? `${statePrefix}${name}` : ''
  }

  /**
   * 生成CSS变量样式对象
   * 根据提供的对象生成带有命名空间前缀的CSS变量
   * @param object 包含CSS变量名和值的对象
   * @returns 返回生成的CSS变量样式对象
   */
  const cssVar = (object: Record<string, string>) => {
    const styles: Record<string, string> = {}
    for (const key in object) {
      if (object[key]) {
        styles[`--${namespace.value}-${key}`] = object[key]
      }
    }
    return styles
  }

  /**
   * 生成带有块前缀的CSS变量样式对象
   * 类似于cssVar，但额外包含块名称作为前缀
   * @param object 包含CSS变量名和值的对象
   * @returns 返回生成的带有块前缀的CSS变量样式对象
   */
  const cssVarBlock = (object: Record<string, string>) => {
    const styles: Record<string, string> = {}
    for (const key in object) {
      if (object[key]) {
        styles[`--${namespace.value}-${block}-${key}`] = object[key]
      }
    }
    return styles
  }

  /**
   * 生成CSS变量名
   * 根据提供的名称生成带有命名空间前缀的CSS变量名
   * @param name 变量名
   * @returns 返回生成的CSS变量名
   */
  const cssVarName = (name: string) => `--${namespace.value}-${name}`

  /**
   * 生成带有块前缀的CSS变量名
   * 类似于cssVarName，但额外包含块名称作为前缀
   * @param name 变量名
   * @returns 返回生成的带有块前缀的CSS变量名
   */
  const cssVarBlockName = (name: string) =>
    `--${namespace.value}-${block}-${name}`

  // 返回所有生成方法，供外部使用
  return {
    namespace,
    b,
    e,
    m,
    be,
    em,
    bm,
    bem,
    is,
    // css
    cssVar,
    cssVarName,
    cssVarBlock,
    cssVarBlockName,
  }
}

export type UseNamespaceReturn = ReturnType<typeof useNamespace>
