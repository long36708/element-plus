import { onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { addUnit } from '@element-plus/utils'

import type { ComputedRef, Ref } from 'vue'

/**
 * 可拖动组件的钩子函数
 * 用于使指定的HTML元素可拖动，并处理拖动相关的逻辑
 *
 * @param targetRef 目标元素的Ref，即需要拖动的元素
 * @param dragRef 触发拖动事件的元素的Ref，可以是目标元素本身或其子元素
 * @param draggable 一个计算属性，决定目标元素是否可拖动
 * @param overflow 可选的计算属性，决定是否允许目标元素在拖动时超出其原始容器的边界
 */
export const useDraggable = (
  targetRef: Ref<HTMLElement | undefined>,
  dragRef: Ref<HTMLElement | undefined>,
  draggable: ComputedRef<boolean>,
  overflow?: ComputedRef<boolean>
) => {
  // 当前目标元素的位置偏移量
  const transform = {
    offsetX: 0,
    offsetY: 0,
  }

  const isDragging = ref(false)

  const adjustPosition = (moveX: number, moveY: number) => {
    if (targetRef.value) {
      const { offsetX, offsetY } = transform
      const targetRect = targetRef.value.getBoundingClientRect()
      const targetLeft = targetRect.left
      const targetTop = targetRect.top
      const targetWidth = targetRect.width
      const targetHeight = targetRect.height

      const clientWidth = document.documentElement.clientWidth
      const clientHeight = document.documentElement.clientHeight

      const minLeft = -targetLeft + offsetX
      const minTop = -targetTop + offsetY
      const maxLeft = clientWidth - targetLeft - targetWidth + offsetX
      const maxTop =
        clientHeight -
        targetTop -
        (targetHeight < clientHeight ? targetHeight : 0) +
        offsetY

      if (!overflow?.value) {
        moveX = Math.min(Math.max(moveX, minLeft), maxLeft)
        moveY = Math.min(Math.max(moveY, minTop), maxTop)
      }

      transform.offsetX = moveX
      transform.offsetY = moveY

      targetRef.value.style.transform = `translate(${addUnit(moveX)}, ${addUnit(
        moveY
      )})`
    }
  }

  const onMousedown = (e: MouseEvent) => {
    const downX = e.clientX
    const downY = e.clientY
    const { offsetX, offsetY } = transform

    const onMousemove = (e: MouseEvent) => {
      if (!isDragging.value) {
        isDragging.value = true
      }
      const moveX = offsetX + e.clientX - downX
      const moveY = offsetY + e.clientY - downY

      adjustPosition(moveX, moveY)
    }

    /**
     * 鼠标释放事件处理函数
     * 移除鼠标移动和释放事件监听器
     */
    const onMouseup = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', onMousemove)
      document.removeEventListener('mouseup', onMouseup)
    }

    // 添加鼠标移动和释放事件监听器
    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
  }

  /**
   * 启用拖动功能
   * 为目标元素或其子元素添加鼠标按下事件监听器
   */
  const onDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.addEventListener('mousedown', onMousedown)
      window.addEventListener('resize', updatePosition)
    }
  }

  /**
   * 禁用拖动功能
   * 为目标元素或其子元素移除鼠标按下事件监听器
   */
  const offDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.removeEventListener('mousedown', onMousedown)
      window.removeEventListener('resize', updatePosition)
    }
  }

  /**
   * 重置目标元素的位置
   * 将偏移量重置为0，并更新目标元素的样式
   */
  const resetPosition = () => {
    transform.offsetX = 0
    transform.offsetY = 0

    if (targetRef.value) {
      targetRef.value.style.transform = ''
    }
  }

  const updatePosition = () => {
    const { offsetX, offsetY } = transform

    adjustPosition(offsetX, offsetY)
  }

  // 在组件挂载时，根据draggable的值启用或禁用拖动功能
  onMounted(() => {
    watchEffect(() => {
      if (draggable.value) {
        onDraggable()
      } else {
        offDraggable()
      }
    })
  })

  // 在组件卸载前禁用拖动功能
  onBeforeUnmount(() => {
    offDraggable()
  })

  // 返回重置位置的函数，以便外部调用
  return {
    isDragging,
    resetPosition,
    updatePosition,
  }
}
