import { computed, getCurrentInstance } from 'vue'
import type { ComputedRef } from 'vue'

/**
 * 从当前组件实例中获取一个属性作为计算属性。
 * 此函数主要用于 Vue 3 的组合式 API 中，以响应式方式获取传递给组件的属性。
 *
 * @param name - 要获取的属性名称。
 * @returns 返回一个包含指定属性值的 ComputedRef，如果属性不存在则返回 undefined。
 */
export const useProp = <T>(name: string): ComputedRef<T | undefined> => {
  // 获取当前组件实例
  const vm = getCurrentInstance()
  // 返回一个计算属性，从组件的 props 中读取指定的属性
  return computed(() => (vm?.proxy?.$props as any)?.[name])
}
