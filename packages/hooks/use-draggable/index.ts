import { onBeforeUnmount, onMounted, watchEffect } from 'vue'
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
  let transform = {
    offsetX: 0,
    offsetY: 0,
  }

  /**
   * 鼠标按下事件处理函数
   * 记录鼠标按下的位置，并计算目标元素可拖动的范围
   *
   * @param e 鼠标事件对象
   */
  const onMousedown = (e: MouseEvent) => {
    const downX = e.clientX
    const downY = e.clientY
    const { offsetX, offsetY } = transform

    // 获取目标元素的矩形信息
    const targetRect = targetRef.value!.getBoundingClientRect()
    const targetLeft = targetRect.left
    const targetTop = targetRect.top
    const targetWidth = targetRect.width
    const targetHeight = targetRect.height

    // 获取当前视口的宽度和高度
    const clientWidth = document.documentElement.clientWidth
    const clientHeight = document.documentElement.clientHeight

    // 计算目标元素拖动的最小和最大位置
    const minLeft = -targetLeft + offsetX
    const minTop = -targetTop + offsetY
    const maxLeft = clientWidth - targetLeft - targetWidth + offsetX
    const maxTop = clientHeight - targetTop - targetHeight + offsetY

    /**
     * 鼠标移动事件处理函数
     * 根据鼠标移动的距离计算新的偏移量，并更新目标元素的位置
     *
     * @param e 鼠标事件对象
     */
    const onMousemove = (e: MouseEvent) => {
      let moveX = offsetX + e.clientX - downX
      let moveY = offsetY + e.clientY - downY

      // 如果不允许超出边界，则限制偏移量在可拖动范围内
      if (!overflow?.value) {
        moveX = Math.min(Math.max(moveX, minLeft), maxLeft)
        moveY = Math.min(Math.max(moveY, minTop), maxTop)
      }

      // 更新偏移量
      transform = {
        offsetX: moveX,
        offsetY: moveY,
      }

      // 更新目标元素的位置
      if (targetRef.value) {
        targetRef.value.style.transform = `translate(${addUnit(
          moveX
        )}, ${addUnit(moveY)})`
      }
    }

    /**
     * 鼠标释放事件处理函数
     * 移除鼠标移动和释放事件监听器
     */
    const onMouseup = () => {
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
    }
  }

  /**
   * 禁用拖动功能
   * 为目标元素或其子元素移除鼠标按下事件监听器
   */
  const offDraggable = () => {
    if (dragRef.value && targetRef.value) {
      dragRef.value.removeEventListener('mousedown', onMousedown)
    }
  }

  /**
   * 重置目标元素的位置
   * 将偏移量重置为0，并更新目标元素的样式
   */
  const resetPosition = () => {
    transform = {
      offsetX: 0,
      offsetY: 0,
    }
    if (targetRef.value) {
      targetRef.value.style.transform = 'none'
    }
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
    resetPosition,
  }
}
