import { computed } from 'vue'
import { useFormItem, useFormItemInputId } from '@element-plus/components/form'
import { isArray, isPropAbsent } from '@element-plus/utils'
import { useDeprecated } from '@element-plus/hooks'
import { useCheckboxDisabled } from './use-checkbox-disabled'
import { useCheckboxEvent } from './use-checkbox-event'
import { useCheckboxModel } from './use-checkbox-model'
import { useCheckboxStatus } from './use-checkbox-status'

import type { ComponentInternalInstance } from 'vue'
import type { CheckboxProps } from '../checkbox'

/**
 * 自定义复选框钩子函数
 * 该函数用于处理复选框组件的状态和行为，包括表单项集成、模型处理、状态管理、事件处理等
 * @param props 复选框组件的属性，包含复选框的各种配置和值
 * @param slots 复选框组件的插槽，用于自定义复选框的内容
 * @returns 返回一个对象，包含复选框组件所需的各种状态和事件处理函数
 */
export const useCheckbox = (
  props: CheckboxProps,
  slots: ComponentInternalInstance['slots']
) => {
  // 集成表单项，获取表单项上下文
  const { formItem: elFormItem } = useFormItem()
  // 处理复选框模型，获取模型状态和是否为复选框组等信息
  const { model, isGroup, isLimitExceeded } = useCheckboxModel(props)
  // 处理复选框状态，获取是否聚焦、是否选中、大小、是否有自定义标签、实际值等信息
  const {
    isFocused,
    isChecked,
    checkboxButtonSize,
    checkboxSize,
    hasOwnLabel,
    actualValue,
  } = useCheckboxStatus(props, slots, { model })
  // 处理复选框禁用状态
  const { isDisabled } = useCheckboxDisabled({ model, isChecked })
  // 生成复选框的唯一标识符和表单项关联
  const { inputId, isLabeledByFormItem } = useFormItemInputId(props, {
    formItemContext: elFormItem,
    disableIdGeneration: hasOwnLabel,
    disableIdManagement: isGroup,
  })
  // 处理复选框事件，包括值变化和点击事件
  const { handleChange, onClickRoot } = useCheckboxEvent(props, {
    model,
    isLimitExceeded,
    hasOwnLabel,
    isDisabled,
    isLabeledByFormItem,
  })

  /**
   * 设置存储值
   * 该函数用于初始化复选框的值，如果复选框被选中，则将其值添加到模型中
   */
  const setStoreValue = () => {
    /**
     * 添加到存储
     * 如果模型值为数组且不包含当前复选框的值，则将当前值添加到模型数组中
     * 否则，将模型值设置为props中定义的true值或默认的true
     */
    function addToStore() {
      if (isArray(model.value) && !model.value.includes(actualValue.value)) {
        model.value.push(actualValue.value)
      } else {
        model.value = props.trueValue ?? props.trueLabel ?? true
      }
    }
    // 如果复选框被选中，则调用添加到存储函数
    props.checked && addToStore()
  }

  // 调用设置存储值函数以初始化复选框的值
  setStoreValue()

  // 处理过时的属性，包括label作为value、true-label、false-label等
  // 这些警告帮助开发者使用最新的属性，同时提供版本号和参考链接
  useDeprecated(
    {
      from: 'label act as value',
      replacement: 'value',
      version: '3.0.0',
      scope: 'el-checkbox',
      ref: 'https://element-plus.org/en-US/component/checkbox.html',
    },
    computed(() => isGroup.value && isPropAbsent(props.value))
  )

  useDeprecated(
    {
      from: 'true-label',
      replacement: 'true-value',
      version: '3.0.0',
      scope: 'el-checkbox',
      ref: 'https://element-plus.org/en-US/component/checkbox.html',
    },
    computed(() => !!props.trueLabel)
  )

  useDeprecated(
    {
      from: 'false-label',
      replacement: 'false-value',
      version: '3.0.0',
      scope: 'el-checkbox',
      ref: 'https://element-plus.org/en-US/component/checkbox.html',
    },
    computed(() => !!props.falseLabel)
  )

  // 返回复选框组件所需的各种状态和事件处理函数
  return {
    inputId,
    isLabeledByFormItem,
    isChecked,
    isDisabled,
    isFocused,
    checkboxButtonSize,
    checkboxSize,
    hasOwnLabel,
    model,
    actualValue,
    handleChange,
    onClickRoot,
  }
}
