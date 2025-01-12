import { computed, inject, ref, toRaw } from 'vue'
import { isEqual } from 'lodash-unified'
import { useFormSize } from '@element-plus/components/form'
import { isArray, isBoolean, isObject, isPropAbsent } from '@element-plus/utils'
import { checkboxGroupContextKey } from '../constants'

import type { ComponentInternalInstance } from 'vue'
import type { CheckboxProps } from '../checkbox'
import type { CheckboxModel } from '../composables'

/**
 * 钩子函数，用于管理复选框组件的状态。
 * 该钩子根据传入的属性、插槽和模型，计算实际值、选中状态、聚焦状态、大小以及是否有自己的标签。
 * @param props 传递给复选框组件的属性，包含配置信息，如值和标签。
 * @param slots 传递给复选框组件的插槽内容，用于确定是否存在默认标签。
 * @param model 传递给复选框组件的模型，包含控制复选框选中状态的值。
 * @returns 返回一个对象，包含复选框按钮大小、选中状态、聚焦状态、复选框大小、是否有自己的标签以及实际值。
 */
export const useCheckboxStatus = (
  props: CheckboxProps,
  slots: ComponentInternalInstance['slots'],
  { model }: Pick<CheckboxModel, 'model'>
) => {
  const checkboxGroup = inject(checkboxGroupContextKey, undefined)
  const isFocused = ref(false)
  const actualValue = computed(() => {
    // 在版本 2.x 中，如果没有 props.value，则 props.label 将作为 props.value
    // 在版本 3.x 中，移除此计算值，直接使用 props.value
    if (!isPropAbsent(props.value)) {
      return props.value
    }
    return props.label
  })
  const isChecked = computed<boolean>(() => {
    const value = model.value
    if (isBoolean(value)) {
      return value
    } else if (isArray(value)) {
      if (isObject(actualValue.value)) {
        return value.map(toRaw).some((o) => isEqual(o, actualValue.value))
      } else {
        return value.map(toRaw).includes(actualValue.value)
      }
    } else if (value !== null && value !== undefined) {
      return value === props.trueValue || value === props.trueLabel
    } else {
      return !!value
    }
  })

  const checkboxButtonSize = useFormSize(
    computed(() => checkboxGroup?.size?.value),
    {
      prop: true,
    }
  )
  const checkboxSize = useFormSize(computed(() => checkboxGroup?.size?.value))

  const hasOwnLabel = computed<boolean>(() => {
    return !!slots.default || !isPropAbsent(actualValue.value)
  })

  return {
    checkboxButtonSize,
    isChecked,
    isFocused,
    checkboxSize,
    hasOwnLabel,
    actualValue,
  }
}

export type CheckboxStatus = ReturnType<typeof useCheckboxStatus>
