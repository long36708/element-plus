import { computed, getCurrentInstance, inject, nextTick, watch } from 'vue'
import { useFormItem } from '@element-plus/components/form'
import { debugWarn } from '@element-plus/utils'
import { CHANGE_EVENT } from '@element-plus/constants'
import { checkboxGroupContextKey } from '../constants'
import type { useFormItemInputId } from '@element-plus/components/form'
import type { CheckboxProps } from '../checkbox'
import type {
  CheckboxDisabled,
  CheckboxModel,
  CheckboxStatus,
} from '../composables'

/**
 * 自定义复选框事件钩子
 * 用于处理复选框的各种交互事件，如点击和变化事件
 *
 * @param props 复选框的属性
 * @param model 复选框的模型，包含值和限制条件
 * @param isLimitExceeded 是否超过限制条件
 * @param hasOwnLabel 是否有自己的标签
 * @param isDisabled 是否禁用状态
 * @param isLabeledByFormItem 是否由表单项标签
 */
export const useCheckboxEvent = (
  props: CheckboxProps,
  {
    model,
    isLimitExceeded,
    hasOwnLabel,
    isDisabled,
    isLabeledByFormItem,
  }: Pick<CheckboxModel, 'model' | 'isLimitExceeded'> &
    Pick<CheckboxStatus, 'hasOwnLabel'> &
    Pick<CheckboxDisabled, 'isDisabled'> &
    Pick<ReturnType<typeof useFormItemInputId>, 'isLabeledByFormItem'>
) => {
  // 注入复选框组上下文
  const checkboxGroup = inject(checkboxGroupContextKey, undefined)
  // 获取当前表单项实例
  const { formItem } = useFormItem()
  // 获取当前组件实例的emit函数
  const { emit } = getCurrentInstance()!

  /**
   * 获取标签化的值
   * 根据复选框的trueValue、trueLabel、falseValue、falseLabel属性，返回对应的值
   *
   * @param value 当前值
   * @returns 标签化的值
   */
  function getLabeledValue(value: string | number | boolean) {
    return [true, props.trueValue, props.trueLabel].includes(value)
      ? props.trueValue ?? props.trueLabel ?? true
      : props.falseValue ?? props.falseLabel ?? false
  }

  /**
   * 发射change事件
   *
   * @param checked 当前复选框的值
   * @param e 原生事件对象
   */
  function emitChangeEvent(
    checked: string | number | boolean,
    e: InputEvent | MouseEvent
  ) {
    emit(CHANGE_EVENT, getLabeledValue(checked), e)
  }

  /**
   * 处理复选框变化事件
   *
   * @param e 原生事件对象
   */
  function handleChange(e: Event) {
    if (isLimitExceeded.value) return

    const target = e.target as HTMLInputElement
    emit(CHANGE_EVENT, getLabeledValue(target.checked), e)
  }

  /**
   * 处理复选框点击事件
   *
   * @param e 鼠标事件对象
   */
  async function onClickRoot(e: MouseEvent) {
    if (isLimitExceeded.value) return

    if (!hasOwnLabel.value && !isDisabled.value && isLabeledByFormItem.value) {
      // fix: https://github.com/element-plus/element-plus/issues/9981
      const eventTargets: EventTarget[] = e.composedPath()
      const hasLabel = eventTargets.some(
        (item) => (item as HTMLElement).tagName === 'LABEL'
      )
      if (!hasLabel) {
        model.value = getLabeledValue(
          [false, props.falseValue, props.falseLabel].includes(model.value)
        )
        await nextTick()
        emitChangeEvent(model.value, e)
      }
    }
  }

  // 计算是否需要验证事件
  const validateEvent = computed(
    () => checkboxGroup?.validateEvent || props.validateEvent
  )

  // 监视modelValue变化，触发验证
  watch(
    () => props.modelValue,
    () => {
      if (validateEvent.value) {
        formItem?.validate('change').catch((err) => debugWarn(err))
      }
    }
  )

  // 返回处理函数
  return {
    handleChange,
    onClickRoot,
  }
}
