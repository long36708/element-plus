import { computed, getCurrentInstance, inject, ref, unref } from 'vue'
import { debugWarn, isClient, isNumber } from '@element-plus/utils'
import type { InjectionKey, Ref } from 'vue'

export interface ElZIndexInjectionContext {
  current: number
}

const initial: ElZIndexInjectionContext = {
  current: 0,
}

const zIndex = ref(0)

export const defaultInitialZIndex = 2000

// For SSR
export const ZINDEX_INJECTION_KEY: InjectionKey<ElZIndexInjectionContext> =
  Symbol('elZIndexContextKey')

/**
 * 定义一个用于提供和注入 zIndex 值的上下文键
 * 使用 Symbol 类型来创建一个唯一的键值，避免键值冲突
 * @type {InjectionKey<Ref<number | undefined>>} 一个唯一的键，用于在 Vue 的依赖注入系统中提供和接收 zIndex 的响应式值
 */
export const zIndexContextKey: InjectionKey<Ref<number | undefined>> =
  Symbol('zIndexContextKey')

/**
 * 使用z-index管理工具钩子
 * 该钩子用于在组件中获取和管理z-index值，以确保正确的层级关系
 * 特别适用于需要动态调整z-index的场景，如模态框、提示框等
 *
 * @param zIndexOverrides - 可选的z-index覆写值，用于在当前组件中动态设置z-index
 * @returns 返回一个对象，包含初始z-index、当前z-index和获取下一个z-index的方法
 */
export const useZIndex = (zIndexOverrides?: Ref<number>) => {
  // 获取当前组件实例，用于判断是否在服务端渲染环境中
  const increasingInjection = getCurrentInstance()
    ? inject(ZINDEX_INJECTION_KEY, initial)
    : initial

  // 根据zIndexOverrides参数和当前组件实例情况，获取z-index注入值
  const zIndexInjection =
    zIndexOverrides ||
    (getCurrentInstance() ? inject(zIndexContextKey, undefined) : undefined)

  // 计算初始z-index值，如果注入的z-index是有效数字，则使用它，否则使用默认值
  const initialZIndex = computed(() => {
    const zIndexFromInjection = unref(zIndexInjection)
    return isNumber(zIndexFromInjection)
      ? zIndexFromInjection
      : defaultInitialZIndex
  })

  // 计算当前z-index值，基于初始z-index和全局z-index值
  const currentZIndex = computed(() => initialZIndex.value + zIndex.value)

  /**
   * 获取下一个z-index值的方法
   * 该方法会增加全局z-index值，并返回新的当前z-index值
   * 用于确保每次调用时都能获取到一个递增的z-index值
   */
  const nextZIndex = () => {
    increasingInjection.current++
    zIndex.value = increasingInjection.current
    return currentZIndex.value
  }

  // 在非客户端环境且未注入ZINDEX_INJECTION_KEY时，输出警告信息
  // 提醒开发者在服务端渲染时需要提供z-index管理器
  if (!isClient && !inject(ZINDEX_INJECTION_KEY)) {
    debugWarn(
      'ZIndexInjection',
      `Looks like you are using server rendering, you must provide a z-index provider to ensure the hydration process to be succeed
usage: app.provide(ZINDEX_INJECTION_KEY, { current: 0 })`
    )
  }

  // 返回初始z-index、当前z-index和获取下一个z-index的方法
  return {
    initialZIndex,
    currentZIndex,
    nextZIndex,
  }
}

export type UseZIndexReturn = ReturnType<typeof useZIndex>
