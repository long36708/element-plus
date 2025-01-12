import type { Ref } from 'vue'

/**
 * 自定义钩子用于管理焦点
 *
 * @param el 一个引用对象，其值可能具有focus方法，用于设置焦点
 * @returns 返回一个对象，包含一个focus方法，用于在调用时设置焦点
 */
export const useFocus = (
  el: Ref<{
    focus: () => void
  } | null>
) => {
  return {
    focus: () => {
      el.value?.focus?.()
    },
  }
}
