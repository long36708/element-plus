import { UPDATE_MODEL_EVENT } from '@element-plus/constants'
import { useAriaProps, useSizeProp } from '@element-plus/hooks'
import { buildProps, definePropType, isArray } from '@element-plus/utils'

import type { ExtractPropTypes } from 'vue'
import type checkboxGroup from './checkbox-group.vue'
import type { CheckboxValueType } from './checkbox'

export type CheckboxGroupValueType = Exclude<CheckboxValueType, boolean>[]

export const checkboxGroupProps = buildProps({
  /**
   * @description binding value
   */
  modelValue: {
    type: definePropType<CheckboxGroupValueType>(Array),
    default: () => [],
  },
  /**
   * @description whether the nesting checkboxes are disabled
   */
  disabled: Boolean,
  /**
   * @description minimum number of checkbox checked
   */
  min: Number,
  /**
   * @description maximum number of checkbox checked
   */
  max: Number,
  /**
   * @description size of checkbox
   */
  size: useSizeProp,
  /**
   * @description border and background color when button is active
   */
  fill: String,
  /**
   * @description font color when button is active
   */
  textColor: String,
  /**
   * @description element tag of the checkbox group
   */
  tag: {
    type: String,
    default: 'div',
  },
  /**
   * @description whether to trigger form validation
   */
  validateEvent: {
    type: Boolean,
    default: true,
  },
  ...useAriaProps(['ariaLabel']),
} as const)

/**
 * 定义复选框组的事件发射对象
 * 这里解释了对象的用途和结构
 */
export const checkboxGroupEmits = {
  /**
   * 定义更新模型事件的回调函数
   * 接受一个值作为参数，并验证它是否为数组
   * 这个函数用于验证传入的值是否符合复选框组的值类型
   *
   * @param val 复选框组的新值
   * @returns 如果val是数组则返回true，否则返回false
   */
  [UPDATE_MODEL_EVENT]: (val: CheckboxGroupValueType) => isArray(val),

  /**
   * 定义值改变事件的回调函数
   * 接受一个复选框的值数组作为参数，并验证它是否为数组
   * 这个函数用于处理复选框值变化事件，确保新的值数组格式正确
   *
   * @param val 复选框的新值数组
   * @returns 如果val是数组则返回true，否则返回false
   */
  change: (val: CheckboxValueType[]) => isArray(val),
}

export type CheckboxGroupProps = ExtractPropTypes<typeof checkboxGroupProps>
export type CheckboxGroupEmits = typeof checkboxGroupEmits
export type CheckboxGroupInstance = InstanceType<typeof checkboxGroup> & unknown
