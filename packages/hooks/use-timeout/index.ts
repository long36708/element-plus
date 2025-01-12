import { tryOnScopeDispose } from '@vueuse/core'

/**
 * 自定义 Hook 用于管理 setTimeout 的注册和取消
 *
 * 该 Hook 提供了一种方式来在组件生命周期内安全地设置和清除定时器
 * 主要解决了在组件卸载后定时器仍然可能执行的问题，通过在组件卸载时自动取消未完成的定时器
 */
export function useTimeout() {
  // 定义一个变量来存储 setTimeout 的返回值，用于后续取消定时器
  let timeoutHandle: number

  /**
   * 注册一个定时器
   *
   * @param fn 要在延迟后执行的函数
   * @param delay 延迟时间，单位为毫秒
   *
   * 该函数会在指定的延迟时间后调用传入的函数 fn
   * 在设置新的定时器之前，会先取消之前的定时器（如果存在）
   */
  const registerTimeout = (fn: (...args: any[]) => any, delay: number) => {
    cancelTimeout()
    timeoutHandle = window.setTimeout(fn, delay)
  }

  /**
   * 取消当前的定时器
   *
   * 该函数通过调用 clearTimeout 来取消之前设置的定时器
   * 它在组件卸载时或者在设置新的定时器之前被调用
   */
  const cancelTimeout = () => window.clearTimeout(timeoutHandle)

  // 在组件卸载时调用 cancelTimeout 来确保定时器被正确取消
  tryOnScopeDispose(() => cancelTimeout())

  // 返回 registerTimeout 和 cancelTimeout 函数，以便外部使用
  return {
    registerTimeout,
    cancelTimeout,
  }
}
