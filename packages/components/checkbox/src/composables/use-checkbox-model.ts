import { computed, getCurrentInstance, inject, ref } from 'vue'
import { isArray, isUndefined } from '@element-plus/utils'
import { UPDATE_MODEL_EVENT } from '@element-plus/constants'
import { checkboxGroupContextKey } from '../constants'

import type { CheckboxProps } from '../checkbox'

/**
 * 自定义复选框模型钩子
 * 用于处理复选框或复选框组的状态
 * @param props 复选框的属性，包括modelValue等
 * @returns 返回包含model, isGroup, isLimitExceeded的对象
 */
export const useCheckboxModel = (props: CheckboxProps) => {
  // 初始化自定义模型值，默认为false
  const selfModel = ref<unknown>(false)
  // 获取当前组件实例的emit函数
  const { emit } = getCurrentInstance()!
  // 尝试注入复选框组上下文，如果不存在则为undefined
  const checkboxGroup = inject(checkboxGroupContextKey, undefined)
  // 计算是否属于复选框组
  const isGroup = computed(() => isUndefined(checkboxGroup) === false)
  // 初始化限制超出标志
  const isLimitExceeded = ref(false)

  // 计算属性，用于同步复选框状态
  const model = computed({
    get() {
      // 如果属于复选框组，获取组的模型值，否则获取当前复选框的模型值或默认值
      return isGroup.value
        ? checkboxGroup?.modelValue?.value
        : props.modelValue ?? selfModel.value
    },

    set(val: unknown) {
      // 如果属于复选框组且新值为数组，检查是否超出限制，并更新组的状态
      if (isGroup.value && isArray(val)) {
        isLimitExceeded.value =
          checkboxGroup?.max?.value !== undefined &&
          val.length > checkboxGroup?.max.value &&
          val.length > model.value.length
        // 如果没有超出限制，调用组的变更事件处理函数
        isLimitExceeded.value === false && checkboxGroup?.changeEvent?.(val)
      } else {
        // 如果不属于复选框组，更新当前复选框的模型值，并触发更新事件
        emit(UPDATE_MODEL_EVENT, val)
        selfModel.value = val
      }
    },
  })

  // 返回计算得到的模型值，是否属于复选框组，以及是否超出限制的状态
  return {
    model,
    isGroup,
    isLimitExceeded,
  }
}

export type CheckboxModel = ReturnType<typeof useCheckboxModel>
