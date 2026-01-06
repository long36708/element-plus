import type {
  ComputedRef,
  InjectionKey,
  ToRefs,
  WritableComputedRef,
} from 'vue'
import type { CheckboxGroupProps } from './checkbox-group'

type CheckboxGroupContext = {
  modelValue?: WritableComputedRef<any>
  changeEvent?: (...args: any) => any
  disabled?: ComputedRef<boolean>
} & ToRefs<
  Pick<
    CheckboxGroupProps,
    'size' | 'min' | 'max' | 'validateEvent' | 'fill' | 'textColor'
  >
>

/**
 * 定义一个用于Checkbox组组件的上下文键
 * 这个键用于在Checkbox组内部共享状态和方法
 */
export const checkboxGroupContextKey: InjectionKey<CheckboxGroupContext> =
  Symbol('checkboxGroupContextKey')
